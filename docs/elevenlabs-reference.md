# ElevenLabs API Reference

This document contains key information for integrating ElevenLabs services into the Viper Sales Platform.

## API Authentication

- **Header**: `xi-api-key: YOUR_API_KEY`
- **Base URL**: `https://api.elevenlabs.io`

### Required Permissions

When creating API keys in the ElevenLabs dashboard, ensure these permissions are enabled:

- **Conversational AI** - Required for voice agent functionality
- **Text-to-Speech** - For audio generation
- **Speech-to-Speech** - For voice conversion features

## Conversational AI Agents

### Endpoints

| Purpose | Endpoint | Method |
|---------|----------|--------|
| Get Signed URL | `/v1/convai/conversation/get-signed-url?agent_id={agent_id}` | GET |
| Get Token | `/v1/convai/conversation/token?agent_id={agent_id}` | GET |

### Current Project Configuration

- **Agent ID**: `agent_0501kf6njgv6er2vxmesbh2t6qxr`
- **Edge Function**: `supabase/functions/elevenlabs-roleplay-token/index.ts`
- **Client Component**: `src/components/roleplay/VoiceRoleplay.tsx`

### Connection Types

1. **WebRTC** (Recommended)
   - Lower latency
   - Better audio quality
   - Uses `conversationToken`

2. **WebSocket**
   - More compatible
   - Uses `signedUrl`

## React SDK Integration

### Installation

```bash
npm install @elevenlabs/react
```

### Core Hook

```typescript
import { useConversation } from "@elevenlabs/react";

const conversation = useConversation({
  onConnect: () => console.log("Connected"),
  onDisconnect: () => console.log("Disconnected"),
  onMessage: (message) => console.log("Message:", message),
  onError: (error) => console.error("Error:", error),
});
```

### Starting a Session

```typescript
// With signed URL (WebSocket)
await conversation.startSession({
  signedUrl: data.signed_url,
});

// With token (WebRTC - recommended)
await conversation.startSession({
  conversationToken: data.token,
  connectionType: "webrtc",
});
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `status` | `'connected' \| 'disconnected'` | Connection status |
| `isSpeaking` | `boolean` | Agent speaking state |
| `canSendFeedback` | `boolean` | Feedback availability |

### Key Methods

| Method | Description |
|--------|-------------|
| `startSession(options)` | Start conversation |
| `endSession()` | End conversation |
| `sendUserMessage(text)` | Send text message |
| `sendContextualUpdate(text)` | Send context without response |
| `setVolume({ volume })` | Set output volume (0-1) |

## Voice Models

### Recommended for Real-Time

- **Eleven Flash v2.5**: Low-latency, optimized for real-time conversations

### High Quality

- **Eleven Multilingual v2**: High quality, supports 29 languages

## Client Events

Events received through `onMessage` callback (must be enabled in ElevenLabs dashboard):

| Event | Description |
|-------|-------------|
| `conversation_initiation_metadata` | Initial connection data |
| `user_transcript` | Finalized user speech-to-text |
| `agent_response` | Complete agent message |
| `agent_response_correction` | Truncated response after interruption |
| `client_tool_call` | Client-side function request |
| `vad_score` | Voice Activity Detection (0-1) |

## Error Handling

### Common Error Codes

| Status | Meaning | Solution |
|--------|---------|----------|
| 401 | Invalid API key | Verify API key and permissions |
| 403 | Insufficient permissions | Enable "Conversational AI" permission |
| 404 | Agent not found | Verify Agent ID is correct |
| 429 | Rate limited | Reduce request frequency |

### Example Error Handling

```typescript
const conversation = useConversation({
  onError: (error) => {
    console.error("Conversation error:", error);
    toast({
      variant: "destructive",
      title: "Connection Error",
      description: "Failed to connect to voice agent.",
    });
  },
});
```

## Microphone Permission UX

Always request microphone access before starting a conversation:

```typescript
const requestMicrophoneAccess = async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Microphone Required",
      description: "Please enable microphone access for voice features.",
    });
    return false;
  }
};
```

## Server-Side Implementation

### Edge Function Pattern

```typescript
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

const response = await fetch(
  `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
  {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  }
);

const { signed_url } = await response.json();
```

## References

- [ElevenLabs React SDK](https://elevenlabs.io/docs/agents-platform/libraries/react)
- [Agents Platform Overview](https://elevenlabs.io/docs/agents-platform/overview)
- [API Reference](https://elevenlabs.io/docs/api-reference/introduction)
- [Developer Quickstart](https://elevenlabs.io/docs/developers/quickstart)
