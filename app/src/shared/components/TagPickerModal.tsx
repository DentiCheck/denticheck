import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { X, Hospital as LucideHospital, Package } from 'lucide-react-native';
import { useQuery } from '@apollo/client/react';
import { GET_DENTALS, GET_PRODUCTS } from '../../graphql/queries';

export type TagType = 'product' | 'hospital';

export type Tag = {
  type: TagType;
  name: string;
  id?: string;
};

type TagPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Selected tags list */
  selectedTags: Tag[];
  /** Called when tag is selected (not called if already selected) */
  onSelectTag: (tag: Tag) => void;
  /** Called when tag is removed (index) */
  onRemoveTag: (index: number) => void;
  /** Max number of clinic tags (default: 3) */
  maxHospitalTags?: number;
  /** Whether product tag functionality is enabled (default: false) */
  enableProductTags?: boolean;
};

export function TagPickerModal({
  visible,
  onClose,
  selectedTags,
  onSelectTag,
  onRemoveTag,
  maxHospitalTags = 3,
  enableProductTags = false,
}: TagPickerModalProps) {
  const [dentalSearch, setDentalSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TagType>('hospital');

  const {
    data: dentalsData,
    loading: dentalsLoading,
    error: dentalsError,
  } = useQuery<{
    dentals: Array<{ id: string; name: string; address?: string; phone?: string }>;
  }>(GET_DENTALS, {
    variables: { name: dentalSearch.trim() || undefined, limit: 50 },
    skip: !visible || activeTab !== 'hospital',
    fetchPolicy: 'network-only',
  });
  const dentals = dentalsData?.dentals ?? [];

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
  } = useQuery<{
    products: Array<{ id: string; name: string; category?: string }>;
  }>(GET_PRODUCTS, {
    variables: { limit: 50 },
    skip: !visible || activeTab !== 'product' || !enableProductTags,
    fetchPolicy: 'network-only',
  });
  const products = productsData?.products ?? [];

  const hospitalTags = selectedTags.filter((t) => t.type === 'hospital');
  const productTags = selectedTags.filter((t) => t.type === 'product');
  const canAddMoreHospital = hospitalTags.length < maxHospitalTags;
  const canAddMoreProduct = productTags.length < maxHospitalTags;

  const handleClose = () => {
    setDentalSearch('');
    onClose();
  };

  const handleSelectDental = (dental: { id: string; name: string }) => {
    if (!canAddMoreHospital) return;
    const tag: Tag = { type: 'hospital', name: dental.name, id: dental.id };
    if (!selectedTags.find((t) => t.type === 'hospital' && t.id === dental.id)) {
      onSelectTag(tag);
    }
  };

  const handleSelectProduct = (product: { id: string; name: string }) => {
    if (!canAddMoreProduct) return;
    const tag: Tag = { type: 'product', name: product.name, id: product.id };
    if (!selectedTags.find((t) => t.type === 'product' && t.id === product.id)) {
      onSelectTag(tag);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-gray-50 dark:bg-slate-900 rounded-t-[32px] h-[85%] p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-slate-800 dark:text-white">Add Tag</Text>
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 items-center justify-center bg-slate-200 rounded-full"
            >
              <X size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <View className="flex-row gap-3">
              {enableProductTags ? (
                <TouchableOpacity
                  onPress={() => setActiveTab('product')}
                  className={`flex-row items-center border px-3 py-2 rounded-xl ${activeTab === 'product'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200'
                    }`}
                >
                  <Package
                    size={16}
                    color={activeTab === 'product' ? '#4338ca' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`text-sm font-medium ${activeTab === 'product'
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-300'
                      }`}
                  >
                    Product Tag
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  disabled
                  className="flex-row items-center bg-slate-100 dark:bg-slate-700 border border-slate-200 px-3 py-2 rounded-xl opacity-60"
                >
                  <Package size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                  <Text className="text-sm font-medium text-slate-400">Product Tag (Coming soon)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setActiveTab('hospital')}
                className={`flex-row items-center border px-3 py-2 rounded-xl ${activeTab === 'hospital'
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200'
                  }`}
              >
                <LucideHospital
                  size={16}
                  color={activeTab === 'hospital' ? '#1d4ed8' : '#475569'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`text-sm font-medium ${activeTab === 'hospital'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-300'
                    }`}
                >
                  Select Clinic
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeTab === 'hospital' && (
            <View className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
              {hospitalTags.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {selectedTags.map(
                    (tag, idx) =>
                      tag.type === 'hospital' && (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => onRemoveTag(idx)}
                          className="flex-row items-center pl-3 pr-2 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50"
                        >
                          <Text className="text-xs font-bold mr-1 text-blue-700 dark:text-blue-300">
                            {tag.name}
                          </Text>
                          <X size={12} color="#1d4ed8" />
                        </TouchableOpacity>
                      )
                  )}
                </View>
              )}
              {hospitalTags.length >= maxHospitalTags && (
                <Text className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                  You can select up to {maxHospitalTags} clinics.
                </Text>
              )}
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Showing up to 50 items. Enter name to filter.
              </Text>
              <TextInput
                placeholder="Search clinic name (Optional)"
                placeholderTextColor="#94a3b8"
                value={dentalSearch}
                onChangeText={setDentalSearch}
                className="bg-white dark:bg-slate-700 px-3 py-2 rounded-lg text-slate-800 dark:text-white mb-2"
              />
              <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
                {dentalsLoading ? (
                  <Text className="text-slate-400 text-sm py-2">Loading clinic list...</Text>
                ) : dentalsError ? (
                  <Text className="text-amber-600 dark:text-amber-400 text-sm py-2">
                    Failed to load list. Please check your network.
                  </Text>
                ) : dentals.length === 0 ? (
                  <Text className="text-slate-400 text-sm py-2">
                    {dentalSearch.trim()
                      ? 'No search results.'
                      : 'No registered clinics found. Please check if load_dentals.py was run.'}
                  </Text>
                ) : (
                  dentals.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => handleSelectDental(d)}
                      disabled={!canAddMoreHospital}
                      className={`py-2.5 px-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${!canAddMoreHospital ? 'opacity-50' : ''
                        }`}
                    >
                      <Text className="text-slate-800 dark:text-white font-medium" numberOfLines={1}>
                        {d.name}
                      </Text>
                      {d.address ? (
                        <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                          {d.address}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {activeTab === 'product' && enableProductTags && (
            <View className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
              {productTags.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {selectedTags.map(
                    (tag, idx) =>
                      tag.type === 'product' && (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => onRemoveTag(idx)}
                          className="flex-row items-center pl-3 pr-2 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50"
                        >
                          <Text className="text-xs font-bold mr-1 text-indigo-700 dark:text-indigo-300">
                            {tag.name}
                          </Text>
                          <X size={12} color="#4338ca" />
                        </TouchableOpacity>
                      )
                  )}
                </View>
              )}
              {productTags.length >= maxHospitalTags && (
                <Text className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                  You can select up to {maxHospitalTags} products.
                </Text>
              )}
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Affiliate product list. Selected products will be tagged in the post.
              </Text>
              <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
                {productsLoading ? (
                  <Text className="text-slate-400 text-sm py-2">Loading product list...</Text>
                ) : productsError ? (
                  <Text className="text-amber-600 dark:text-amber-400 text-sm py-2">
                    Failed to load list. Please check your network.
                  </Text>
                ) : products.length === 0 ? (
                  <Text className="text-slate-400 text-sm py-2">No registered products found.</Text>
                ) : (
                  products.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => handleSelectProduct(p)}
                      disabled={!canAddMoreProduct}
                      className={`py-2.5 px-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${!canAddMoreProduct ? 'opacity-50' : ''
                        }`}
                    >
                      <Text className="text-slate-800 dark:text-white font-medium" numberOfLines={1}>
                        {p.name}
                      </Text>
                      {p.category ? (
                        <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                          {p.category}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
