# Backend Structure Document

This document outlines the backend structure for the AI-powered voice conversational bot aimed at product designers. It provides clear, everyday explanations of the backend architecture, hosting solutions, and infrastructure components, so anyone can understand how the system is built and scaled.

## 1. Backend Architecture

The backend is designed as a lightweight, modular application that serves as a bridge between the browser’s native features and the external OpenAI Realtime API. The overall approach is to keep things simple and efficient while allowing room for future enhancements.

Key points:

- Uses a minimalist backend approach with an emphasis on scalability and maintainability.
- Relies primarily on the OpenAI Realtime API to process voice interactions. The browser sends transcribed text directly to the API, and responses are returned in near real-time.
- Optionally integrates **Supabase** for minimal backend functions or future enhancements such as extended logging or user session management.
- Makes use of modern design patterns like request routing and proxying if needed, ensuring a clear separation between presentation (frontend) and backend logic.

## 2. Database Management

Since all conversation data is stored locally on the user’s device during a single session, the backend does not manage persistent user data at this time. However, the system is designed with the possibility of future expansion where minimal backend storage might be required.

If backend storage is needed in future enhancements, **Supabase** (which combines SQL capabilities and additional backend functions) can be used to manage data efficiently.

Key points:

- No centralized database for conversation history, as data is stored locally.
- Future considerations for a backend database using Supabase for extended functionality.

## 3. Database Schema

Currently, since conversation data is stored locally in the browser, a formal database schema is not needed. For future expansion using Supabase (a SQL-based solution), one potential schema might look like this:

**Human Readable Overview:**

- A table for conversation sessions, where each session is identified by a unique session ID, captures the start time, and other session metadata.
- A table for messages that are part of a conversation session, recording the message text, timestamp, sender type (user or bot), and linking to its session ID.

**Sample SQL Schema (PostgreSQL):**

-------------------------------------------------
-- Table: conversation_sessions
-------------------------------------------------
-- id: Unique identifier for the session (Primary Key)
-- started_at: Timestamp when the conversation began
-- ended_at: Timestamp when the conversation ended (Optional)
-------------------------------------------------

CREATE TABLE conversation_sessions (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-------------------------------------------------
-- Table: messages
-------------------------------------------------
-- id: Unique identifier for each message (Primary Key)
-- session_id: Foreign Key linking to conversation_sessions.id
-- sender: Indicates whether the message is from 'user' or 'bot'
-- message_text: The content of the message
-- created_at: Timestamp when the message was created
-------------------------------------------------

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

*Note: This schema is proposed for future enhancements if local storage is eventually complemented by backend data management.*

## 4. API Design and Endpoints

The API design is built around RESTful principles, though the conversational flow is streamlined due to the simple interaction dynamics.

Key points:

- The primary function is to serve as a proxy or a facilitator between the browser and the OpenAI Realtime API. It ensures that the voice-to-text and text-to-speech interactions occur smoothly with real-time API responses.
- Uses clear and concise endpoints that are easy to understand.

**Endpoints Overview:**

- **POST /api/conversation**
  - Purpose: Accepts transcribed text from the user's voice input, passes it to the OpenAI API, and returns the generated response.
  - Payload: { apiKey, message } (the API key provided by the user and their transcribed message)
  - Response: The text response from the OpenAI API for text-to-speech conversion.

- **GET /api/health**
  - Purpose: Provides a simple health check response to ensure the backend is running and reachable.
  - Response: A status message indicating that all systems are operational.

*Future endpoints could be added if Supabase-based logging or session management is put in place, such as endpoints for retrieving past conversation sessions.*

## 5. Hosting Solutions

The backend is hosted on Vercel, which offers several benefits aligned with the project’s goals:

- **Reliability:** Vercel provides a robust platform with minimal downtime and quick recovery from issues.
- **Scalability:** Automatic scaling ensures that even if numerous users interact simultaneously, the backend can handle the load efficiently.
- **Cost-Effectiveness:** With pay-as-you-go pricing and built-in optimizations, hosting costs remain under control while performance stays optimal.

Additionally, Vercel’s integration with modern CI/CD pipelines and version control systems (Git/GitHub) ensures smooth deployments and updates.

## 6. Infrastructure Components

The backend infrastructure is composed of several key components that work together to enhance performance and provide a seamless user experience:

- **Load Balancers:** Managed by Vercel, these distribute incoming requests to ensure the server is not overwhelmed during heavy usage.
- **Caching Mechanisms:** Vercel offers built-in caching to speed up the delivery of static assets and API responses, reducing response times.
- **Content Delivery Networks (CDNs):** Static assets are delivered through Vercel's globally distributed CDN, ensuring users on iPhone mobile browsers experience fast load times.
- **Serverless Functions:** Lightweight functions on Vercel handle API requests, keeping the backend nimble and responsive.

## 7. Security Measures

Security is a fundamental aspect of the backend design, ensuring that both user data and the system itself are protected. Key security practices include:

- **Authentication & API Key Handling:** Although there are no user accounts, the system securely handles user-supplied OpenAI API keys, ensuring they are transmitted over HTTPS and not exposed in logs or error messages.
- **HTTPS Enforcement:** All communication between the client, backend, and OpenAI’s API is encrypted using HTTPS, protecting data in transit.
- **Future-Proofing with Clerk Auth:** While not currently in use, Clerk Auth is included in the tech stack for potential future enhancements that require user authentication and authorization.
- **Input Validation & Sanitization:** All incoming API requests are validated, ensuring that data is processed correctly and securely, reducing the risk of injection attacks.
- **CORS Restrictions:** Implemented properly to ensure that only authorized domains can interact with the backend endpoints.

## 8. Monitoring and Maintenance

To ensure the backend remains reliable and secure, a range of monitoring tools and maintenance practices are in place:

- **Monitoring Tools:** Vercel provides built-in logging and monitoring capabilities that track API performance, error rates, and uptime.
- **External Monitoring:** Integration with tools like Sentry or other APM solutions can provide real-time insights into any issues or performance bottlenecks.
- **Maintenance Strategies:** Regular updates via CI/CD pipelines ensure that the backend receives timely patches and improvements. Proactive error handling and logging facilitate quick troubleshooting and overall reliability.

## 9. Conclusion and Overall Backend Summary

In summary, the backend is designed to be a lightweight, efficient mediator between the browser’s native speech APIs and the powerful OpenAI Realtime API. The key features include:

- A modular architecture that permits easy scalability and future enhancements.
- Minimal database requirements with future potential integration via Supabase.
- A clean RESTful API design facilitating smooth voice interactions and real-time communication.
- Robust hosting on Vercel ensuring high performance, scalability, and reliability.
- Comprehensive infrastructure components, from load balancing and caching to CDNs, all working together.
- Strong security measures that safeguard API keys and data transiting the system.
- Continuous monitoring and proactive maintenance to keep the backend running smoothly.

This backend structure is uniquely tailored to support the project’s goal of delivering an AI-powered, voice-interactive experience on iPhone mobile browsers, while keeping the design minimalistic yet robust for future expansion.
