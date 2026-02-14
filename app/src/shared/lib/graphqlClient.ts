import axios from "axios";

const API_SERVER_URL = process.env.EXPO_PUBLIC_API_SERVER_URL;

export interface ChatAppRequest {
    content: string;
    messageType?: "TEXT" | "QUICK_REPLY" | "CARD" | "ERROR";
    payload?: Record<string, any>;
}

export interface ChatAppResponse {
    sessionId: string;
    userMessageId: string;
    assistantMessageId: string;
    assistantContent: string;
    messageType: "TEXT" | "QUICK_REPLY" | "CARD" | "ERROR";
    payload?: Record<string, any>;
}

export const sendChatMessage = async (channel: string, request: ChatAppRequest): Promise<ChatAppResponse> => {
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

        let data = response.data;
        if (typeof data === "string") {
            try {
                const jsonMatch = data.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    data = JSON.parse(jsonMatch[0]);
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) {
                console.error("Failed to parse response string:", data);
                throw new Error("Invalid JSON response from server");
            }
        }

        if (!data) {
            throw new Error("No response data received from server");
        }

        if (data.errors) {
            console.error("GraphQL Errors:", data.errors);
            throw new Error(data.errors[0].message);
        }

        if (!data.data) {
            console.error("GraphQL response missing data field:", data);
            throw new Error("GraphQL response missing data field");
        }

        return data.data.sendChatMessage;
    } catch (error: any) {
        if (error.response) {
            console.error("HTTP Error:", error.response.status, error.response.data);
            throw new Error(`Server Error: ${error.response.status}`);
        } else if (error.request) {
            console.error("No response received:", error.request);
            throw new Error("No response from server. Check your network.");
        } else {
            console.error("Request Error:", error.message);
            throw error;
        }
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

        let data = response.data;
        if (typeof data === "string") {
            try {
                const jsonMatch = data.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    data = JSON.parse(jsonMatch[0]);
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) {
                console.error("Failed to parse response string:", data);
                throw new Error("Invalid JSON response from server");
            }
        }

        if (!data) {
            throw new Error("No response data received from server");
        }

        if (data.errors) {
            console.error("GraphQL Errors:", data.errors);
            throw new Error(data.errors[0].message);
        }

        if (!data.data) {
            console.error("GraphQL response missing data field:", data);
            throw new Error("GraphQL response missing data field");
        }

        return data.data.endChatSession;
    } catch (error: any) {
        if (error.response) {
            console.error("HTTP Error:", error.response.status, error.response.data);
            throw new Error(`Server Error: ${error.response.status}`);
        } else if (error.request) {
            console.error("No response received:", error.request);
            throw new Error("No response from server. Check your network.");
        } else {
            console.error("Request Error:", error.message);
            throw error;
        }
    }
};
