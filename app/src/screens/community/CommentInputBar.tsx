import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { ImagePlus, X, Hospital as LucideHospital, Package } from 'lucide-react-native';
import { useAuth } from '../../shared/providers/AuthProvider';
import { TagPickerModal, type Tag } from '../../shared/components/TagPickerModal';

type CommentInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  sendLabel?: string;
  /** 전송 중이면 버튼 비활성화 */
  sending?: boolean;
  /** 선택된 이미지 1장 (로컬 uri). 있으면 썸네일 표시 */
  imageUri?: string | null;
  /** 이미지 추가 버튼 탭 (갤러리/카메라 선택은 부모에서 처리) */
  onAddImage?: () => void;
  /** 선택 이미지 제거 */
  onRemoveImage?: () => void;
  /** 선택된 태그 목록 */
  selectedTags?: Tag[];
  /** 태그 선택 시 호출 */
  onSelectTag?: (tag: Tag) => void;
  /** 태그 제거 시 호출 */
  onRemoveTag?: (index: number) => void;
};

export function CommentInputBar({
  value,
  onChangeText,
  onSend,
  placeholder = '댓글 달기...',
  sendLabel = '게시',
  sending = false,
  imageUri = null,
  onAddImage,
  onRemoveImage,
  selectedTags = [],
  onSelectTag,
  onRemoveTag,
}: CommentInputBarProps) {
  const { user } = useAuth();
  const canSend = value.trim().length > 0 && !sending;
  const canAddImage = !imageUri && onAddImage;
  const [showTagPicker, setShowTagPicker] = useState(false);

  const profileInitial = user?.name?.trim()?.[0]
    ?? user?.email?.trim()?.[0]
    ?? '나';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-4 py-3"
    >
      <View className="flex-row items-end gap-3">
        <View className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center overflow-hidden">
          {user?.picture ? (
            <Image
              source={{ uri: user.picture }}
              className="w-8 h-8"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {profileInitial}
            </Text>
          )}
        </View>
        <View className="flex-1">
          {/* 선택된 태그 표시 */}
          {selectedTags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-2">
              {selectedTags.map((tag, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => onRemoveTag?.(idx)}
                  className={`flex-row items-center pl-3 pr-2 py-1.5 rounded-full ${
                    tag.type === 'hospital'
                      ? 'bg-blue-100 dark:bg-blue-900/50'
                      : 'bg-indigo-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold mr-1 ${
                      tag.type === 'hospital'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-indigo-700'
                    }`}
                  >
                    {tag.name}
                  </Text>
                  <X
                    size={12}
                    color={tag.type === 'hospital' ? '#1d4ed8' : '#4338ca'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View className="flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-700">
            {canAddImage && (
              <TouchableOpacity onPress={onAddImage} className="mr-2 p-1">
                <ImagePlus size={20} color="#64748b" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowTagPicker(true)}
              className="mr-2 p-1"
            >
              <LucideHospital size={20} color="#64748b" />
            </TouchableOpacity>
            <TextInput
              className="flex-1 h-9 text-sm text-slate-800 dark:text-white min-w-0"
              placeholder={placeholder}
              placeholderTextColor="#94a3b8"
              value={value}
              onChangeText={onChangeText}
            />
            <TouchableOpacity onPress={onSend} disabled={!canSend} className="ml-1">
              <Text
                className={`text-sm font-bold ${
                  canSend ? 'text-blue-600' : 'text-slate-300'
                }`}
              >
                {sending ? '등록 중...' : sendLabel}
              </Text>
            </TouchableOpacity>
          </View>
          {imageUri ? (
            <View className="mt-2 flex-row items-center">
              <View className="relative">
                <Image
                  source={{ uri: imageUri }}
                  className="w-14 h-14 rounded-lg bg-slate-200"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={onRemoveImage}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-700 items-center justify-center"
                >
                  <X size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* 태그 추가 모달 */}
      <TagPickerModal
        visible={showTagPicker}
        onClose={() => setShowTagPicker(false)}
        selectedTags={selectedTags}
        onSelectTag={onSelectTag || (() => {})}
        onRemoveTag={onRemoveTag || (() => {})}
      />
    </KeyboardAvoidingView>
  );
}
