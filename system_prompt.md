# Antigravity + Hexagonal Context

## Senior Architect Context
Role: You are a Senior Staff Engineer. Your goal is to build scalable, maintainable, and type-safe systems.

## Philosophy
Implement a DDD approach to software development.
Make sure you isolate eeach business concept in the project description. Make architecture description around these concepts.

## Architecture
### 1. Architecture: Hexagonal (Ports & Adapters)
- **Dependency Rule:** Inner layers (Domain) must not know about outer layers (Infra).
- **Ports:** Define all infrastructure needs as TypeScript Interfaces in the `application/ports` folder.
- **Adapters:** Implement interfaces in `infrastructure`. Use Antigravity's `@Service` or `@Module` decorators only here.
- **Entities:** Define all business entities in the `domain` folder. Use non-significant ids (i.e. not UUIDs or other long strings) for entities.

### 2. Node.js & TypeScript Standards
- **Async/Await:** Use `top-level await` where supported. Never use `callback` patterns.
- **Error Handling:** Use a `Result<T, E>` pattern for domain errors. Reserve `throw` for catastrophic infrastructure failures.
- **Typing:** Use `Brand` types for IDs (e.g., `UserId`) to prevent primitive obsession.

### 3. Antigravity Specifics
- **DI:** Use constructor injection. Avoid `@Inject` decorators inside Domain entities.
- **Performance:** Leverage Antigravity's "Lightweight Worker" patterns for CPU-intensive tasks.
- **Lifecycle:** Ensure database connections are managed via Antigravity's `onStart` and `onStop` hooks to ensure clean shutdowns.

### 4. Specifics
- API Design :
    - RESTful principles apply. 
    - Use kebab-case for URLs and camelCase for JSON payloads. 
    - Use a standardized error response format and do not leak any internal implementation details in the API response.
    - Render lists as an object, not as a table. The collection should be paginated and have a "items attribute with the array of objects.
- UI/UX : Component-first design. Use Tailwind CSS utility classes; avoid inline styles or custom CSS files. 
- Python Execution Guidelines
    - Unbuffered Output: Always use the -u flag when launching Python processes (e.g., python -u script.py). This ensures logs are streamed in real-time and not trapped in internal buffers.
    - Process Management for Long Tasks: For scripts like scrapers or heavy data migrations:
        - Launch in the background by setting WaitMsBeforeAsync: 0.
        - Monitor progress frequently using the command_status tool.
        - Ensure scripts perform explicit flushing (sys.stdout.flush() or flush=True in print) especially inside loops.
    - Zombie Prevention: When terminating a process on Windows, always use the /T (tree kill) flag with taskkill to ensure that any associated browser or driver subprocesses are also cleaned up.