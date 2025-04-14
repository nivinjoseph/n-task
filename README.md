# n-task

A TypeScript library for task parallelization in both frontend and backend environments using web workers and worker threads.

## Features

- **Cross-Platform Support**: Works in both frontend (browser) and backend (Node.js) environments
- **Task Parallelization**: Execute multiple tasks concurrently using worker threads
- **Task Pool Management**: Efficient management of worker pools with configurable worker count
- **TypeScript Support**: Full TypeScript support with type definitions
- **Modern JavaScript**: Built with modern JavaScript features and async/await support

## Installation

```bash
npm install @nivinjoseph/n-task
# or
yarn add @nivinjoseph/n-task
```

## Requirements

- Node.js >= 20.10
- TypeScript >= 5.3.3

## Usage

### Frontend (Browser)

```typescript
import { TaskPool } from '@nivinjoseph/n-task/frontend';

// Define your worker class
class MyWorker {
    public async processData(data: any): Promise<any> {
        // Your processing logic here
        return processedData;
    }
}

// Create a task pool with 4 workers
const taskPool = new TaskPool(MyWorker, 4);

// Initialize the workers
await taskPool.initializeWorkers();

// Execute tasks
const result = await taskPool.invoke('processData', { /* your data */ });

// Clean up when done
await taskPool.dispose();
```

### Backend (Node.js)

```typescript
import { TaskPool } from '@nivinjoseph/n-task/backend';

// Define your worker class
class MyWorker {
    public async processData(data: any): Promise<any> {
        // Your processing logic here
        return processedData;
    }
}

// Create a task pool with 4 workers
const taskPool = new TaskPool(MyWorker, 4);

// Initialize the workers
await taskPool.initializeWorkers();

// Execute tasks
const result = await taskPool.invoke('processData', { /* your data */ });

// Clean up when done
await taskPool.dispose();
```

## API Reference

### TaskPool

The main class for managing worker pools.

#### Constructor
```typescript
constructor(taskWorker: Function, count = 1)
```
- `taskWorker`: The worker class to be instantiated
- `count`: Number of workers to create (default: 1)

#### Methods

##### initializeWorkers
```typescript
async initializeWorkers(initializerMethod?: string, ...initializerParams: Array<any>): Promise<void>
```
Initializes the worker pool and optionally calls an initialization method on each worker.

##### invoke
```typescript
async invoke<T>(method: string, ...params: Array<any>): Promise<T>
```
Executes a method on an available worker and returns the result.

##### dispose
```typescript
async dispose(): Promise<void>
```
Cleans up resources and terminates all workers.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For support, please open an issue in the [GitHub repository](https://github.com/nivinjoseph/n-task/issues).

## License

MIT License - See [LICENSE](LICENSE) file for details.
