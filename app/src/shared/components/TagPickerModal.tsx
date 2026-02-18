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
import { GET_DENTALS } from '../../graphql/queries';

export type TagType = 'product' | 'hospital';

export type Tag = {
  type: TagType;
  name: string;
  id?: string;
};

type TagPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  /** 선택된 태그 목록 */
  selectedTags: Tag[];
  /** 태그 선택 시 호출 (이미 선택된 태그는 호출되지 않음) */
  onSelectTag: (tag: Tag) => void;
  /** 태그 제거 시 호출 (index) */
  onRemoveTag: (index: number) => void;
  /** 병원 태그 최대 개수 (기본값: 3) */
  maxHospitalTags?: number;
  /** 상품 태그 기능 활성화 여부 (기본값: false) */
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

  const hospitalTags = selectedTags.filter((t) => t.type === 'hospital');
  const canAddMoreHospital = hospitalTags.length < maxHospitalTags;

  const handleClose = () => {
    setDentalSearch('');
    onClose();
  };

  const handleSelectDental = (dental: { id: string; name: string }) => {
    if (!canAddMoreHospital) return;
    const tag: Tag = { type: 'hospital', name: dental.name, id: dental.id };
    // 이미 선택된 태그인지 확인
    if (!selectedTags.find((t) => t.type === 'hospital' && t.id === dental.id)) {
      onSelectTag(tag);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-gray-50 dark:bg-slate-900 rounded-t-[32px] h-[85%] p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-slate-800 dark:text-white">태그 추가</Text>
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
                  className={`flex-row items-center border px-3 py-2 rounded-xl ${
                    activeTab === 'product'
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
                    className={`text-sm font-medium ${
                      activeTab === 'product'
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    상품 태그
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  disabled
                  className="flex-row items-center bg-slate-100 dark:bg-slate-700 border border-slate-200 px-3 py-2 rounded-xl opacity-60"
                >
                  <Package size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                  <Text className="text-sm font-medium text-slate-400">상품 태그 (준비 중)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setActiveTab('hospital')}
                className={`flex-row items-center border px-3 py-2 rounded-xl ${
                  activeTab === 'hospital'
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
                  className={`text-sm font-medium ${
                    activeTab === 'hospital'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  치과 선택
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
                  병원은 최대 {maxHospitalTags}개까지 선택할 수 있어요.
                </Text>
              )}
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                검색어 없이 보면 최대 50개 목록이 보이고, 입력하면 이름으로 필터돼요.
              </Text>
              <TextInput
                placeholder="치과 이름 검색 (선택)"
                placeholderTextColor="#94a3b8"
                value={dentalSearch}
                onChangeText={setDentalSearch}
                className="bg-white dark:bg-slate-700 px-3 py-2 rounded-lg text-slate-800 dark:text-white mb-2"
              />
              <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
                {dentalsLoading ? (
                  <Text className="text-slate-400 text-sm py-2">치과 목록을 불러오는 중...</Text>
                ) : dentalsError ? (
                  <Text className="text-amber-600 dark:text-amber-400 text-sm py-2">
                    목록을 불러오지 못했어요. 네트워크를 확인해 주세요.
                  </Text>
                ) : dentals.length === 0 ? (
                  <Text className="text-slate-400 text-sm py-2">
                    {dentalSearch.trim()
                      ? '검색 결과가 없어요.'
                      : '등록된 치과가 없어요. load_dentals.py 실행 여부를 확인해 주세요.'}
                  </Text>
                ) : (
                  dentals.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => handleSelectDental(d)}
                      disabled={!canAddMoreHospital}
                      className={`py-2.5 px-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                        !canAddMoreHospital ? 'opacity-50' : ''
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
              <Text className="text-slate-400 text-sm py-2">상품 태그 기능은 준비 중입니다.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
