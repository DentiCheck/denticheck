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
  } catch (_) { }
  return url;
}

export type CommentFormModalMode = 'edit' | 'reply';

export type CommentFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** 'edit' = comment edit, 'reply' = reply creation */
  mode: CommentFormModalMode;
  /** Modal title (e.g. 'Edit Comment', 'Reply') */
  title: string;
  /** Initial content (existing comment for edit, empty string for reply) */
  initialContent: string;
  /** Initial image URL (existing image for edit, null for reply) */
  initialImageUrl: string | null;
  /** Initial tags (existing tags for edit, [] for reply) */
  initialTags: Tag[];
  /** When save button is clicked. Image upload is handled before calling. */
  onSave: (payload: { content: string; imageUrl: string; dentalIds: string[]; productIds: string[] }) => Promise<void>;
  /** Saving status (button disabled/loading text) */
  saving: boolean;
  /** When picking image (gallery etc.). Returns selected uri or null. */
  onPickImage: () => Promise<string | null>;
  /** Upload selected image uri and return server URL */
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
      const productIds = tags
        .filter((t): t is Tag & { id: string } => t.type === 'product' && !!t.id)
        .map((t) => t.id);
      await onSave({ content: trimmed, imageUrl: finalImageUrl, dentalIds, productIds });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(mode === 'edit' ? 'Edit Failed' : 'Reply Failed', msg);
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
              placeholder="Comment content"
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
                    className={`flex-row items-center px-2 py-1 rounded-md ${tag.type === 'product' ? 'bg-indigo-50' : 'bg-blue-50'
                      }`}
                  >
                    {tag.type === 'product' ? (
                      <Package size={12} color="#4f46e5" />
                    ) : (
                      <LucideHospital size={12} color="#2563eb" />
                    )}
                    <Text
                      className={`ml-1 text-xs font-bold ${tag.type === 'product' ? 'text-indigo-600' : 'text-blue-600'
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
              <Text className="ml-2 text-sm text-slate-600 dark:text-slate-300">Select tags (Clinic/Product)</Text>
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
                <Text className="text-xs text-slate-500 mt-1">Image</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-end gap-3 mt-4">
              <TouchableOpacity onPress={onClose} className="px-4 py-2">
                <Text className="text-slate-500 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !content.trim()}
                className="px-4 py-2"
              >
                <Text className={`font-medium ${content.trim() && !saving ? 'text-blue-600' : 'text-slate-300'}`}>
                  {saving ? 'Saving...' : 'Save'}
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
        maxHospitalTags={3}
        enableProductTags={true}
      />
    </>
  );
}
