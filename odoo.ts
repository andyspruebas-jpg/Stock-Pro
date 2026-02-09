export interface OdooProduct {
    barcode: string;
    supplierCode: string;
    description: string;
    cost: number;
    price: number;
    supplierName: string;
    category: string;
    provider: string;
    stock: number;
}

const ODOO_CONFIG = {
    url: "/api/odoo",
    db: "ati",
    username: "api_odoo@ati.com.bo",
    password: "7474"
};

export const testOdooConnection = async (): Promise<boolean> => {
    try {
        console.log("🔍 Testing Odoo connection...");
        const authResponse = await fetch(`${ODOO_CONFIG.url}/web/session/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                params: { db: ODOO_CONFIG.db, login: ODOO_CONFIG.username, password: ODOO_CONFIG.password }
            })
        });

        const authResult = await authResponse.json();
        if (authResult.error || !authResult.result || !authResult.result.uid) {
            console.log("❌ Odoo connection test failed");
            return false;
        }

        console.log("✅ Odoo connection test successful");
        return true;
    } catch (error) {
        console.error("❌ Odoo connection test error:", error);
        return false;
    }
};

export const fetchOdooProducts = async (): Promise<OdooProduct[]> => {
    console.log("🔐 Authenticating with Odoo...");

    try {
        const authResponse = await fetch(`${ODOO_CONFIG.url}/web/session/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                params: { db: ODOO_CONFIG.db, login: ODOO_CONFIG.username, password: ODOO_CONFIG.password }
            })
        });

        const contentType = authResponse.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("Backend server not reachable. Please ensure 'npm run server' is running.");
        }

        const authResult = await authResponse.json();
        console.log("📋 Auth response:", JSON.stringify(authResult, null, 2));

        if (authResult.error) {
            const errorMsg = authResult.error.data?.message || authResult.error.message || 'Unknown error';
            throw new Error(`Authentication failed: ${errorMsg}`);
        }

        if (!authResult.result || !authResult.result.uid) {
            console.error("❌ Auth result:", authResult);
            throw new Error("Authentication failed: No UID returned. Please check credentials.");
        }

        console.log("✅ Authentication successful");

        // 1. Get total count first
        console.log("📊 Getting total product count...");
        const countResponse = await fetch(`${ODOO_CONFIG.url}/web/dataset/call_kw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "product.product",
                    method: "search_count",
                    args: [[]],
                    kwargs: {}
                },
                id: 1
            })
        });

        const countResult = await countResponse.json();
        console.log("📊 Raw count result:", JSON.stringify(countResult));

        if (countResult.error) {
            console.error("❌ Odoo returned error for count:", countResult.error);
        }

        const totalCount = countResult.result || 0;
        console.log(`📊 Total products to fetch: ${totalCount}`);

        if (totalCount === 0) {
            console.log("⚠️ No products found.");
            return [];
        }

        // 2. Fetch all products in one go
        console.log(`📥 Fetching all ${totalCount} products...`);
        const dataResponse = await fetch(`${ODOO_CONFIG.url}/web/dataset/call_kw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "product.product",
                    method: "search_read",
                    args: [[]],
                    kwargs: {
                        fields: ["id", "name", "display_name", "default_code", "barcode", "lst_price", "standard_price", "categ_id", "seller_ids", "qty_available", "virtual_available", "free_qty"],
                        limit: totalCount, // Fetch all
                        offset: 0
                    }
                },
                id: 2
            })
        });

        const dataResult = await dataResponse.json();
        if (dataResult.error) throw new Error(`Data fetch failed: ${dataResult.error.message}`);

        const allProducts = dataResult.result || [];
        console.log(`✅ Fetched ${allProducts.length} products successfully.`);

        if (allProducts.length > 0) {
            console.log("🔍 Sample Product Stock Data:", {
                name: allProducts[0].name,
                qty_available: allProducts[0].qty_available,
                virtual_available: allProducts[0].virtual_available,
                raw: allProducts[0]
            });
        }
        console.log(`📦 Total fetched: ${allProducts.length} products from Odoo`);

        console.log(`📦 Total fetched: ${allProducts.length} products from Odoo`);

        console.log("🏭 Fetching real stock levels from stock.quant...");
        const productIds = allProducts.map((p: any) => p.id);
        const stockMap = await fetchStockFromQuants(productIds);

        console.log("👥 Fetching supplier names and costs...");
        const supplierMap = await fetchSupplierNames(allProducts);

        return allProducts.map((p: any) => {
            let category = 'Sin Categoría';
            if (Array.isArray(p.categ_id) && p.categ_id.length > 1) {
                let fullCat = p.categ_id[1];
                fullCat = fullCat.replace('All products /', '').trim();
                category = fullCat;
            }

            let name = p.display_name || p.name || 'Sin Nombre';
            name = name.replace(/^\[.*?\]\s*/, '');
            name = name.replace(/\((.*?)\)/, '$1');

            let provider = 'N/A';
            let cost = p.standard_price || 0;

            if (Array.isArray(p.seller_ids) && p.seller_ids.length > 0) {
                // Find the best matching seller
                let bestSeller = null;

                for (const sellerId of p.seller_ids) {
                    const sellerData = supplierMap.get(sellerId);
                    if (sellerData) {
                        // Check if this seller info is specific to a variant
                        if (sellerData.productId) {
                            // If it is specific, it MUST match our current product ID
                            if (sellerData.productId === p.id) {
                                bestSeller = sellerData;
                                break; // Found exact match, stop looking
                            }
                        } else {
                            // If it's not specific (generic for template), it's a candidate
                            // We keep the first one we find, but continue looking for a specific match
                            if (!bestSeller) {
                                bestSeller = sellerData;
                            }
                        }
                    }
                }

                if (bestSeller) {
                    provider = bestSeller.name;
                    cost = bestSeller.price;
                } else if (p.seller_ids.length > 0) {
                    // Fallback if we have seller IDs but none matched (shouldn't happen often if logic is correct)
                    // or if we couldn't fetch details for them
                    provider = `Provider ID: ${p.seller_ids[0]}`;
                }
            }

            return {
                barcode: p.barcode || String(p.id),
                supplierCode: p.default_code || '',
                description: name.trim(),
                cost: cost,
                price: p.lst_price || 0,
                supplierName: provider !== 'N/A' ? provider : 'Odoo Import',
                category: category,
                provider: provider,
                stock: stockMap.has(p.id) ? stockMap.get(p.id)! : (p.free_qty || p.qty_available || p.virtual_available || 0)
            };
        });

    } catch (error) {
        console.error("❌ Odoo Sync Error:", error);
        throw error;
    }
};

const fetchSupplierNames = async (products: any[]): Promise<Map<number, { name: string, price: number, productId: number | null }>> => {
    try {
        const sellerIds = new Set<number>();
        products.forEach(p => {
            if (Array.isArray(p.seller_ids)) {
                p.seller_ids.forEach((id: number) => sellerIds.add(id));
            }
        });

        if (sellerIds.size === 0) {
            console.log("  ℹ️ No seller IDs found");
            return new Map();
        }

        console.log(`  📋 Fetching names and prices for ${sellerIds.size} unique suppliers...`);
        const sellerIdsArray = Array.from(sellerIds);

        const supplierinfoResponse = await fetch(`${ODOO_CONFIG.url}/web/dataset/call_kw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "product.supplierinfo",
                    method: "search_read",
                    args: [[['id', 'in', sellerIdsArray]]],
                    kwargs: {
                        fields: ['id', 'partner_id', 'price', 'product_id'],
                        limit: false
                    }
                },
                id: 998
            })
        });

        const supplierinfoResult = await supplierinfoResponse.json();

        if (supplierinfoResult.error) {
            console.error("❌ Error fetching supplierinfo:", supplierinfoResult.error);
            return new Map();
        }

        const supplierinfos = supplierinfoResult.result || [];
        console.log(`  ✓ Got ${supplierinfos.length} supplierinfo records`);

        const partnerIds = new Set<number>();
        const sellerToDataMap = new Map<number, { partnerId: number, price: number, productId: number | null }>();

        supplierinfos.forEach((info: any) => {
            if (info.partner_id && Array.isArray(info.partner_id) && info.partner_id.length > 0) {
                const partnerId = info.partner_id[0];
                partnerIds.add(partnerId);

                let productId = null;
                if (info.product_id && Array.isArray(info.product_id) && info.product_id.length > 0) {
                    productId = info.product_id[0];
                }

                sellerToDataMap.set(info.id, { partnerId, price: info.price || 0, productId });
            }
        });

        console.log(`  ✓ Found ${partnerIds.size} unique partners`);

        if (partnerIds.size === 0) {
            console.log("  ⚠️ No partner IDs found");
            return new Map();
        }

        const partnerResponse = await fetch(`${ODOO_CONFIG.url}/web/dataset/call_kw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "res.partner",
                    method: "search_read",
                    args: [[['id', 'in', Array.from(partnerIds)]]],
                    kwargs: {
                        fields: ['id', 'name'],
                        limit: false
                    }
                },
                id: 999
            })
        });

        const partnerResult = await partnerResponse.json();

        if (partnerResult.error) {
            console.error("❌ Error fetching partners:", partnerResult.error);
            return new Map();
        }

        const partners = partnerResult.result || [];
        console.log(`  ✓ Got ${partners.length} partner records`);

        const partnerNameMap = new Map<number, string>();
        partners.forEach((partner: any) => {
            if (partner.name) {
                partnerNameMap.set(partner.id, partner.name);
            }
        });

        const supplierMap = new Map<number, { name: string, price: number, productId: number | null }>();
        sellerToDataMap.forEach((data, sellerId) => {
            const companyName = partnerNameMap.get(data.partnerId);
            if (companyName) {
                supplierMap.set(sellerId, { name: companyName, price: data.price, productId: data.productId });
            }
        });

        console.log(`  ✅ Successfully mapped ${supplierMap.size} suppliers to company names and prices`);
        return supplierMap;

    } catch (error) {
        console.error("❌ Error fetching supplier names:", error);
        return new Map();
    }
};

export const getProductsByBarcodes = async (barcodes: string[]): Promise<Map<string, OdooProduct>> => {
    if (!barcodes || barcodes.length === 0) return new Map();

    const uniqueBarcodes = [...new Set(barcodes.filter(b => b && b.trim() !== ''))];
    if (uniqueBarcodes.length === 0) return new Map();

    console.log(`🔍 Fetching details for ${uniqueBarcodes.length} barcodes from Odoo...`);

    try {
        // Authenticate with Odoo (Lightweight)
        const authResponse = await fetch(`${ODOO_CONFIG.url}/web/session/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                params: { db: ODOO_CONFIG.db, login: ODOO_CONFIG.username, password: ODOO_CONFIG.password }
            })
        });
        const authResult = await authResponse.json();
        if (authResult.error) throw new Error("Auth failed");

        // Fetch products by barcode
        const response = await fetch(`${ODOO_CONFIG.url}/web/dataset/call_kw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "product.product",
                    method: "search_read",
                    args: [[['barcode', 'in', uniqueBarcodes]]],
                    kwargs: {
                        fields: ["id", "name", "display_name", "default_code", "barcode", "lst_price", "standard_price", "categ_id", "seller_ids", "qty_available", "virtual_available", "free_qty"],
                        limit: false
                    }
                },
                id: Math.floor(Math.random() * 1000)
            })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error.message || "Error fetching products");

        const products = result.result || [];
        console.log(`✅ Found ${products.length} products in Odoo`);

        // Get supplier info for these products - similar logic to fetchOdooProducts
        const supplierMap = await fetchSupplierNames(products);

        // Get stock info from stock.quant
        const productIds = products.map((p: any) => p.id);
        const stockMap = await fetchStockFromQuants(productIds);

        const resultMap = new Map<string, OdooProduct>();

        products.forEach((p: any) => {
            if (!p.barcode) return;

            let category = 'Sin Categoría';
            if (Array.isArray(p.categ_id) && p.categ_id.length > 1) {
                let fullCat = p.categ_id[1];
                fullCat = fullCat.replace('All products /', '').trim();
                category = fullCat;
            }

            let name = p.display_name || p.name || 'Sin Nombre';
            name = name.replace(/^\[.*?\]\s*/, '');
            name = name.replace(/\((.*?)\)/, '$1');

            let provider = 'N/A';
            let cost = p.standard_price || 0;

            if (Array.isArray(p.seller_ids) && p.seller_ids.length > 0) {
                let bestSeller = null;
                for (const sellerId of p.seller_ids) {
                    const sellerData = supplierMap.get(sellerId);
                    if (sellerData) {
                        if (sellerData.productId) {
                            if (sellerData.productId === p.id) {
                                bestSeller = sellerData;
                                break;
                            }
                        } else {
                            if (!bestSeller) {
                                bestSeller = sellerData;
                            }
                        }
                    }
                }

                if (bestSeller) {
                    provider = bestSeller.name;
                    cost = bestSeller.price;
                }
            }

            resultMap.set(p.barcode, {
                barcode: p.barcode,
                supplierCode: p.default_code || '',
                description: name.trim(),
                cost: cost,
                price: p.lst_price || 0,
                supplierName: provider !== 'N/A' ? provider : 'Odoo Import',
                category: category,
                provider: provider,
                stock: stockMap.has(p.id) ? stockMap.get(p.id)! : (p.free_qty || p.qty_available || p.virtual_available || 0)
            });
        });

        return resultMap;

    } catch (error) {
        console.error("❌ Error fetching products by barcode:", error);
        return new Map();
    }
};

export const updateProductPrice = async (barcode: string, newPrice: number, newCost?: number, providerName?: string): Promise<boolean> => {
    console.log(`⚠️ Odoo update disabled by configuration. Simulating update for ${barcode}`);
    console.log(`   New Price: ${newPrice}, New Cost: ${newCost}, Provider: ${providerName}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`✅ Product "updated" successfully (Simulation)`);
    return true;
};

const fetchStockFromQuants = async (productIds: number[]): Promise<Map<number, number>> => {
    if (productIds.length === 0) return new Map();

    console.log(`🏭 Querying stock.quant for ${productIds.length} products...`);
    try {
        const response = await fetch(`${ODOO_CONFIG.url}/web/dataset/call_kw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "stock.quant",
                    method: "search_read",
                    args: [[
                        ['product_id', 'in', productIds],
                        ['location_id.usage', '=', 'internal'] // Only count internal locations
                    ]],
                    kwargs: {
                        fields: ['product_id', 'quantity'],
                        limit: false
                    }
                },
                id: 888
            })
        });

        const result = await response.json();
        if (result.error) {
            console.error("❌ Error fetching quants:", result.error);
            return new Map();
        }

        const quants = result.result || [];
        console.log(`🏭 Retrieved ${quants.length} stock quant records.`);

        // Aggregate by product_id
        const stockMap = new Map<number, number>();

        quants.forEach((q: any) => {
            if (q.product_id && Array.isArray(q.product_id)) {
                const pid = q.product_id[0];
                const current = stockMap.get(pid) || 0;
                stockMap.set(pid, current + (q.quantity || 0));
            }
        });

        return stockMap;
    } catch (error) {
        console.error("❌ Error in fetchStockFromQuants:", error);
        return new Map();
    }
};
