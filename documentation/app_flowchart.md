flowchart TD
    A[Open App on iPhone] --> B{API Key Present?}
    B -- Yes --> C[Display Chat Interface]
    B -- No --> D[Prompt for API Key]
    D --> C
    C --> E[User Presses Voice Button]
    E --> F[Initiate Speech-to-Text]
    F --> G[Transcribe Voice]
    G --> H[Send Text to OpenAI API]
    H --> I[Receive API Response]
    I --> J[Initiate Text-to-Speech]
    J --> K[Output Audio Response]
    K --> L[Store Conversation Locally]
    L --> M[End Conversation]
    M --> N[Option to Restart Conversation]