/**
 * Frontend File: Partner Products Page
 * Path: console/src/features/products/pages/ProductsPage.tsx
 * Description: [관리자 기능] 제휴 상품 관리 페이지
 * - 상품 목록 조회, 추가(모달), 검색 기능
 */
import { useState, useEffect } from 'react';
import { AddProductModal } from '@/features/products/components/AddProductModal';
import { EditProductModal } from '@/features/products/components/EditProductModal';
import { useLanguage } from '@/features/dashboard/context/LanguageContext';
import { graphqlRequest } from '@/shared/lib/api';
import { SearchFilterBar } from '@/shared/components/SearchFilterBar';

const GET_PRODUCTS_QUERY = `
    query AdminProducts($category: String, $keyword: String) {
        adminProducts(category: $category, keyword: $keyword) {
            id
            displayId
            category
            name
            price
            manufacturer
            imageUrl
            isPartner
        }
    }
`;

const DELETE_PRODUCT_MUTATION = `
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id)
    }
`;

export function ProductsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const { t } = useLanguage();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [filter, setFilter] = useState('all');

    const fetchProducts = () => {
        setLoading(true);
        const params: any = {};
        if (filter === 'category') {
            params.category = keyword;
        } else {
            params.keyword = keyword;
        }

        graphqlRequest(GET_PRODUCTS_QUERY, params)
            .then(data => {
                setProducts(data.adminProducts || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`'${name}' 상품을 삭제하시겠습니까?`)) {
            try {
                await graphqlRequest(DELETE_PRODUCT_MUTATION, { id });
                alert('상품이 삭제되었습니다.');
                fetchProducts();
            } catch (error) {
                console.error(error);
                alert(t('msg_delete_fail'));
            }
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchProducts();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('menu_products')}</h2>
                    <p className="text-slate-500">{t('desc_products')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <SearchFilterBar
                        keyword={keyword}
                        setKeyword={setKeyword}
                        filter={filter}
                        setFilter={setFilter}
                        onSearch={handleSearch}
                        options={[
                            { value: 'all', label: t('filter_all') },
                            { value: '칫솔류', label: t('cat_toothbrush') },
                            { value: '치약 및 세정제', label: t('cat_paste') },
                            { value: '치간, 혀 및 구강', label: t('cat_interdental') },
                            { value: '특수케어', label: t('cat_special') },
                            { value: '기타', label: t('cat_etc') }
                        ]}
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                        {t('btn_add_product')}
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium">NO</th>
                                <th className="px-6 py-3 font-medium">{t('th_category')}</th>
                                <th className="px-6 py-3 font-medium">{t('th_product_name')}</th>
                                <th className="px-6 py-3 font-medium">{t('th_manufacturer')}</th>
                                <th className="px-6 py-3 font-medium">{t('th_price')}</th>
                                <th className="px-6 py-3 font-medium text-center">{t('th_partner')}</th>
                                <th className="px-6 py-3 font-medium text-center">{t('th_action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        {t('no_products')}
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{product.displayId}</td>
                                        <td className="px-6 py-4 text-slate-600">{product.category}</td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">
                                            <div className="flex items-center gap-3">
                                                {product.imageUrl && (
                                                    <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded bg-slate-100 object-cover" />
                                                )}
                                                {product.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{product.manufacturer}</td>
                                        <td className="px-6 py-4 text-slate-600">₩{product.price.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${product.isPartner
                                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                {product.isPartner ? t('status_partnered') : t('status_unpartnered')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center items-center gap-3">
                                                <button
                                                    className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                                                    onClick={async () => {
                                                        try {
                                                            await graphqlRequest(`
                                                                mutation UpdateProductPartnerStatus($id: ID!, $isPartner: Boolean!) {
                                                                    updateProductPartnerStatus(id: $id, isPartner: $isPartner) { id isPartner }
                                                                }
                                                            `, { id: product.id, isPartner: !product.isPartner });
                                                            fetchProducts();
                                                        } catch (error) {
                                                            console.error(error);
                                                            alert('상태 변경에 실패했습니다.');
                                                        }
                                                    }}
                                                >
                                                    {product.isPartner ? t('btn_partner_off') : t('btn_partner_on')}
                                                </button>
                                                <button
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                >
                                                    {t('btn_edit')}
                                                </button>
                                                <button
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                >
                                                    {t('btn_delete')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchProducts();
                    alert('상품이 추가되었습니다.');
                }}
            />

            <EditProductModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedProduct(null);
                }}
                onSuccess={() => {
                    fetchProducts();
                }}
                product={selectedProduct}
            />
        </div>
    )
}
