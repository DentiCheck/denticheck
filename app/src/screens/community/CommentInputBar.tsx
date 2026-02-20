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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImagePlus, X, Hospital as LucideHospital, Package } from 'lucide-react-native';
import { useAuth } from '../../shared/providers/AuthProvider';
import { TagPickerModal, type Tag } from '../../shared/components/TagPickerModal';

type CommentInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  sendLabel?: string;
  /** Disable button if sending */
  sending?: boolean;
  /** 1 selected image (local uri). Show thumbnail if present. */
  imageUri?: string | null;
  /** Tap image add button (gallery/camera selection handled in parent) */
  onAddImage?: () => void;
  /** Remove selected image */
  onRemoveImage?: () => void;
  /** Selected tags list */
  selectedTags?: Tag[];
  /** Called when tag is selected */
  onSelectTag?: (tag: Tag) => void;
  /** Called when tag is removed */
  onRemoveTag?: (index: number) => void;
};

export function CommentInputBar({
  value,
  onChangeText,
  onSend,
  placeholder = 'Reply...',
  sendLabel = 'Post',
  sending = false,
  imageUri = null,
  onAddImage,
  onRemoveImage,
  selectedTags = [],
  onSelectTag,
  onRemoveTag,
}: CommentInputBarProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const canSend = value.trim().length > 0 && !sending;
  const canAddImage = !imageUri && onAddImage;
  const [showTagPicker, setShowTagPicker] = useState(false);

  const profileInitial = user?.name?.trim()?.[0]
    ?? user?.email?.trim()?.[0]
    ?? 'Me';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
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
          {/* Display selected tags */}
          {selectedTags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-2">
              {selectedTags.map((tag, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => onRemoveTag?.(idx)}
                  className={`flex-row items-center pl-3 pr-2 py-1.5 rounded-full ${tag.type === 'hospital'
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-indigo-100'
                    }`}
                >
                  <Text
                    className={`text-xs font-bold mr-1 ${tag.type === 'hospital'
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
              className="flex-1 min-h-[36px] text-sm text-slate-800 dark:text-white min-w-0 py-0"
              placeholder={placeholder}
              placeholderTextColor="#94a3b8"
              value={value}
              onChangeText={onChangeText}
              textAlignVertical="center"
              style={{ includeFontPadding: false }}
            />
            <TouchableOpacity onPress={onSend} disabled={!canSend} className="ml-1">
              <Text
                className={`text-sm font-bold ${canSend ? 'text-blue-600' : 'text-slate-300'
                  }`}
              >
                {sending ? 'Posting...' : sendLabel}
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

      {/* Tag add modal */}
      <TagPickerModal
        visible={showTagPicker}
        onClose={() => setShowTagPicker(false)}
        selectedTags={selectedTags}
        onSelectTag={onSelectTag || (() => { })}
        onRemoveTag={onRemoveTag || (() => { })}
        maxHospitalTags={3}
        enableProductTags={true}
      />
    </KeyboardAvoidingView>
  );
}
