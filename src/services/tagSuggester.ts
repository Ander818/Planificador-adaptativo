import { extractTagsFromText, TagWorkerRequest, TagWorkerResponse } from '../workers/tagSuggester.worker';
import { Task, TaskCategory } from '../types';

export interface TagSuggestionResult {
  suggestedTags: string[];
  confidence: Record<string, number>;
  sourceKeywords: Record<string, string[]>;
  isBackgroundProcessing?: boolean;
}

export class TagSuggesterService {
  private static worker: Worker | null = null;
  private static workerInitialized = false;
  private static activeCallbacks = new Map<string, (result: TagSuggestionResult) => void>();
  private static requestIdCounter = 0;
  private static debounceTimer: any = null;

  /**
   * Initializes or gets the background Web Worker instance
   */
  private static getWorker(): Worker | null {
    if (this.workerInitialized) {
      return this.worker;
    }

    this.workerInitialized = true;

    try {
      if (typeof window !== 'undefined' && window.Worker) {
        // Vite syntax for web workers with module support
        this.worker = new Worker(
          new URL('../workers/tagSuggester.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<TagWorkerResponse>) => {
          const { id, suggestedTags, confidence, sourceKeywords } = event.data;
          const callback = this.activeCallbacks.get(id);
          if (callback) {
            this.activeCallbacks.delete(id);
            callback({
              suggestedTags,
              confidence,
              sourceKeywords,
              isBackgroundProcessing: false,
            });
          }
        };

        this.worker.onerror = (err) => {
          console.warn('TagSuggester Web Worker error, falling back to main-thread processing:', err);
          this.worker = null;
        };
      }
    } catch (e) {
      console.warn('Could not instantiate TagSuggester Web Worker, using fallback:', e);
      this.worker = null;
    }

    return this.worker;
  }

  /**
   * Request tag suggestions in the background with debouncing.
   * Runs in Web Worker if available, or async microtask fallback.
   */
  public static requestSuggestionsDebounced(
    title: string,
    description: string,
    category: TaskCategory | string | undefined,
    existingUserTags: string[],
    onResult: (result: TagSuggestionResult) => void,
    onProcessingStart?: () => void,
    delayMs = 280
  ): () => void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // If description and title are both empty or too short, return empty
    if (!title.trim() && !description.trim()) {
      onResult({
        suggestedTags: [],
        confidence: {},
        sourceKeywords: {},
        isBackgroundProcessing: false,
      });
      return () => {};
    }

    if (onProcessingStart) {
      onProcessingStart();
    }

    this.debounceTimer = setTimeout(() => {
      this.runBackgroundSuggestion(title, description, category, existingUserTags, onResult);
    }, delayMs);

    return () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    };
  }

  /**
   * Runs the background suggestion processing
   */
  public static runBackgroundSuggestion(
    title: string,
    description: string,
    category: TaskCategory | string | undefined,
    existingUserTags: string[],
    onResult: (result: TagSuggestionResult) => void
  ) {
    const worker = this.getWorker();
    const reqId = `tag-req-${++this.requestIdCounter}-${Date.now()}`;

    if (worker) {
      this.activeCallbacks.set(reqId, onResult);
      const payload: TagWorkerRequest = {
        id: reqId,
        title,
        description,
        category,
        existingUserTags,
      };
      worker.postMessage(payload);
    } else {
      // Async fallback execution via requestIdleCallback or setTimeout
      const scheduleFallback = typeof window !== 'undefined' && (window as any).requestIdleCallback
        ? (window as any).requestIdleCallback
        : (cb: Function) => setTimeout(cb, 16);

      scheduleFallback(() => {
        const res = extractTagsFromText(title, description, category, existingUserTags);
        onResult({
          suggestedTags: res.suggestedTags,
          confidence: res.confidence,
          sourceKeywords: res.sourceKeywords,
          isBackgroundProcessing: false,
        });
      });
    }
  }

  /**
   * Immediate synchronous or Promise-based helper to auto-tag a newly created task
   * if it has no tags assigned by the user.
   */
  public static suggestTagsForTask(
    task: { title: string; description?: string; category?: TaskCategory | string },
    existingUserTags: string[] = []
  ): string[] {
    if (!task.title && !task.description) return [];
    const res = extractTagsFromText(
      task.title || '',
      task.description || '',
      task.category,
      existingUserTags
    );
    return res.suggestedTags;
  }

  /**
   * Extracts all unique tags from an array of tasks to feed the user taxonomy learner
   */
  public static getAllUserTags(tasks: Task[]): string[] {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (Array.isArray(t.tags)) {
        t.tags.forEach((tag) => {
          if (tag && tag.trim()) set.add(tag.trim());
        });
      }
    });
    return Array.from(set);
  }
}
