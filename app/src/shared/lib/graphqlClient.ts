import axios from 'axios';

const API_SERVER_URL = process.env.EXPO_PUBLIC_API_SERVER_URL;

export interface ChatAppRequest {
  content: string;
  messageType?: 'TEXT' | 'QUICK_REPLY' | 'CARD' | 'ERROR';
  payload?: Record<string, any>;
}

export interface ChatAppResponse {
  sessionId: string;
  userMessageId: string;
  assistantMessageId: string;
  assistantContent: string;
  messageType: 'TEXT' | 'QUICK_REPLY' | 'CARD' | 'ERROR';
  payload?: Record<string, any>;
}

export const sendChatMessage = async (
  channel: string,
  request: ChatAppRequest
): Promise<ChatAppResponse> => {
  const query = `
    mutation SendChatMessage($channel: String!, $request: ChatAppRequest!) {
      sendChatMessage(channel: $channel, request: $request) {
        sessionId
        userMessageId
        assistantMessageId
        assistantContent
        messageType
        payload
      }
    }
  `;

  const variables = {
    channel,
    request,
  };

  try {
    const response = await axios.post(`${API_SERVER_URL}/graphql`, {
      query,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data.sendChatMessage;
  } catch (error: any) {
    console.error('GraphQL Error:', error);
    throw error;
  }
};
export const endChatSession = async (channel: string): Promise<boolean> => {
  const query = `
    mutation EndChatSession($channel: String!) {
      endChatSession(channel: $channel)
    }
  `;

  const variables = {
    channel,
  };

  try {
    const response = await axios.post(`${API_SERVER_URL}/graphql`, {
      query,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data.endChatSession;
  } catch (error: any) {
    console.error('GraphQL Error:', error);
    throw error;
  }
};
