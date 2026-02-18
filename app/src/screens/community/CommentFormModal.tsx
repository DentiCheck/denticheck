import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { ImagePlus, X, Package, Hospital as LucideHospital } from 'lucide-react-native';
import { type Tag, TagPickerModal } from '../../shared/components/TagPickerModal';
import { BASE_URL } from '../../shared/lib/constants';

function resolveImageUrl(url: string): string {
  if (!url?.trim()) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      const base = new URL(BASE_URL);
      return base.origin + u.pathname + (u.search || '');
    }
  } catch (_) {}
  return url;
}

export type CommentFormModalMode = 'edit' | 'reply';

export type CommentFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** 'edit' = 댓글 수정, 'reply' = 답글 달기 */
  mode: CommentFormModalMode;
  /** 모달 제목 (예: '댓글 수정', '답글 달기') */
  title: string;
  /** 초기 내용 (edit 시 기존 댓글, reply 시 빈 문자열) */
  initialContent: string;
  /** 초기 이미지 URL (edit 시 기존 이미지, reply 시 null) */
  initialImageUrl: string | null;
  /** 초기 태그 (edit 시 기존 태그, reply 시 []) */
  initialTags: Tag[];
  /** 저장 버튼 클릭 시. 이미지 업로드는 호출 전에 처리됨. */
  onSave: (payload: { content: string; imageUrl: string; dentalIds: string[] }) => Promise<void>;
  /** 저장 중 여부 (버튼 비활성/로딩 문구) */
  saving: boolean;
  /** 이미지 선택 시 (갤러리 등). 선택된 uri 또는 null 반환. */
  onPickImage: () => Promise<string | null>;
  /** 선택된 이미지 uri를 업로드하고 서버 URL 반환 */
  uploadImage: (uri: string) => Promise<string>;
};

export function CommentFormModal({
  visible,
  onClose,
  mode,
  title,
  initialContent,
  initialImageUrl,
  initialTags,
  onSave,
  saving,
  onPickImage,
  uploadImage,
}: CommentFormModalProps) {
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [showTagPicker, setShowTagPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setContent(initialContent);
      setImageUrl(initialImageUrl);
      setNewImageUri(null);
      setTags([...(initialTags ?? [])]);
    }
  }, [visible, initialContent, initialImageUrl, initialTags]);

  const handlePickImage = async () => {
    const uri = await onPickImage();
    if (uri) setNewImageUri(uri);
  };

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      let finalImageUrl: string;
      if (newImageUri) {
        finalImageUrl = await uploadImage(newImageUri);
      } else {
        finalImageUrl = imageUrl ?? '';
      }
      const dentalIds = tags
        .filter((t): t is Tag & { id: string } => t.type === 'hospital' && !!t.id)
        .map((t) => t.id);
      await onSave({ content: trimmed, imageUrl: finalImageUrl, dentalIds });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(mode === 'edit' ? '댓글 수정 실패' : '답글 등록 실패', msg);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1 bg-black/50 justify-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-xl p-4"
          >
            <Text className="text-base font-bold text-slate-800 dark:text-white mb-3">{title}</Text>
            <TextInput
              className="bg-gray-50 dark:bg-slate-700 rounded-lg px-4 py-3 text-slate-800 dark:text-white text-sm min-h-[80px]"
              placeholder="댓글 내용"
              placeholderTextColor="#94a3b8"
              value={content}
              onChangeText={setContent}
              multiline
            />
            {tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-3">
                {tags.map((tag, idx) => (
                  <View
                    key={idx}
                    className={`flex-row items-center px-2 py-1 rounded-md ${
                      tag.type === 'product' ? 'bg-indigo-50' : 'bg-blue-50'
                    }`}
                  >
                    {tag.type === 'product' ? (
                      <Package size={12} color="#4f46e5" />
                    ) : (
                      <LucideHospital size={12} color="#2563eb" />
                    )}
                    <Text
                      className={`ml-1 text-xs font-bold ${
                        tag.type === 'product' ? 'text-indigo-600' : 'text-blue-600'
                      }`}
                    >
                      {tag.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTags(tags.filter((_, i) => i !== idx))}
                      className="ml-1"
                    >
                      <X size={12} color={tag.type === 'product' ? '#4f46e5' : '#2563eb'} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              onPress={() => setShowTagPicker(true)}
              className="mt-3 flex-row items-center justify-center px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg"
            >
              <LucideHospital size={16} color="#64748b" />
              <Text className="ml-2 text-sm text-slate-600 dark:text-slate-300">치과 선택</Text>
            </TouchableOpacity>
            <View className="mt-3 flex-row items-center gap-3">
              {newImageUri ? (
                <View className="relative">
                  <Image
                    source={{ uri: newImageUri }}
                    className="w-20 h-20 rounded-lg bg-slate-200"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setNewImageUri(null)}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-700 items-center justify-center"
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : imageUrl ? (
                <View className="relative">
                  <Image
                    source={{ uri: resolveImageUrl(imageUrl) }}
                    className="w-20 h-20 rounded-lg bg-slate-200"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setImageUrl(null)}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-700 items-center justify-center"
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={handlePickImage}
                className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-slate-700 items-center justify-center border border-dashed border-slate-300 dark:border-slate-600"
              >
                <ImagePlus size={28} color="#64748b" />
                <Text className="text-xs text-slate-500 mt-1">이미지</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-end gap-3 mt-4">
              <TouchableOpacity onPress={onClose} className="px-4 py-2">
                <Text className="text-slate-500 font-medium">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !content.trim()}
                className="px-4 py-2"
              >
                <Text className={`font-medium ${content.trim() && !saving ? 'text-blue-600' : 'text-slate-300'}`}>
                  {saving ? '저장 중...' : '저장'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <TagPickerModal
        visible={showTagPicker}
        onClose={() => setShowTagPicker(false)}
        selectedTags={tags}
        onSelectTag={(tag) => {
          if (!tags.find((t) => t.type === tag.type && (tag.id ? t.id === tag.id : t.name === tag.name))) {
            setTags([...tags, tag]);
          }
        }}
        onRemoveTag={(index) => setTags(tags.filter((_, i) => i !== index))}
        maxHospitalTags={5}
        enableProductTags={false}
      />
    </>
  );
}
