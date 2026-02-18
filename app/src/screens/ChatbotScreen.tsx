import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Send, Bot, RefreshCcw } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColorTheme } from "../shared/providers/ColorThemeProvider";
import {
  sendChatMessage,
  ChatAppRequest,
  endChatSession,
} from "../shared/lib/graphqlClient";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content:
    "안녕하세요! 구강 건강 상담 AI입니다. 궁금하신 점을 편하게 물어보세요.",
  timestamp: new Date(),
};

export default function ChatbotScreen() {
  const { theme } = useColorTheme();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  }, [messages, isTyping]);

  const quickQuestions = [
    "충치 원인",
    "스케일링 주기",
    "올바른 양치법",
    "치실 사용법",
  ];

  const handleNewChat = async () => {
    try {
      await endChatSession("oral_faq");
      setMessages([
        {
          ...INITIAL_MESSAGE,
          id: Date.now().toString(),
          timestamp: new Date(),
        },
      ]);
      setInput("");
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const request: ChatAppRequest = {
        content: messageText,
        messageType: "TEXT",
      };

      // Channel name 'oral_faq' as default for now, could be dynamic
      const response = await sendChatMessage("oral_faq", request);

      const assistantMessage: Message = {
        id: response.assistantMessageId,
        role: "assistant",
        content: response.assistantContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "죄송합니다. 메시지 전송 중 오류가 발생했습니다.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Minimal Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 z-10">
          <Text className="text-2xl font-extrabold text-slate-800 dark:text-white">
            AI 상담
          </Text>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={handleNewChat} className="p-2">
              <RefreshCcw size={20} color={theme.primary} />
            </TouchableOpacity>
            <View className="bg-green-100 px-2 py-1 rounded-full flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full bg-green-500" />
              <Text className="text-[10px] font-bold text-green-700">
                Online
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 20 }}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`flex-row gap-3 mb-6 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {message.role === "assistant" && (
                <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center border border-slate-200">
                  <Bot size={18} color={theme.primary} />
                </View>
              )}

              <View
                className={`max-w-[80%] ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <View
                  className={`p-4 rounded-2xl ${message.role === "user"
                      ? "bg-blue-500 rounded-tr-none"
                      : "bg-white rounded-tl-none border border-slate-100"
                    }`}
                  style={
                    message.role === "assistant"
                      ? {
                        elevation: 2,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                      }
                      : undefined
                  }
                >
                  <Text
                    className={`text-[15px] leading-6 ${message.role === "user" ? "text-white" : "text-slate-700"}`}
                  >
                    {message.content.replace(/\*\*/g, "")}
                  </Text>
                </View>
                <Text className="text-[10px] text-slate-400 mt-1 px-1">
                  {message.timestamp.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View className="flex-row gap-3 mb-6">
              <View className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center">
                <Bot size={18} color={theme.primary} />
              </View>
              <View
                className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 w-16 items-center"
                style={{
                  elevation: 2,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                }}
              >
                <View className="flex-row gap-1 h-3 items-center">
                  <BouncingDot delay={0} />
                  <BouncingDot delay={150} />
                  <BouncingDot delay={300} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Actions & Input */}
        <View className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="py-3 px-4 border-b border-slate-50"
          >
            {quickQuestions.map((q, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSend(q)}
                className="mr-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full"
              >
                <Text className="text-slate-600 text-xs font-medium">{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={100}
          >
            <View className="px-4 py-3 flex-row gap-3 items-center">
              <TextInput
                className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3 text-slate-800 dark:text-white text-base max-h-24"
                placeholder="메시지를 입력하세요..."
                placeholderTextColor="#94a3b8"
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!input.trim()}
                className={`w-12 h-12 rounded-full items-center justify-center ${input.trim() ? "bg-blue-500" : "bg-slate-200"
                  }`}
                style={
                  input.trim()
                    ? {
                      elevation: 4,
                      shadowColor: "#3b82f6",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                    }
                    : undefined
                }
              >
                <Send size={20} color="white" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </View>
  );
}

function BouncingDot({ delay }: { delay: number }) {
  const animation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: -4,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, animation]);

  return (
    <Animated.View style={{ transform: [{ translateY: animation }] }}>
      <View className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
    </Animated.View>
  );
}
