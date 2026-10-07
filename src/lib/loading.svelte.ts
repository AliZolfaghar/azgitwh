/** Manual busy counter for client fetch / long work outside navigations. */
class ContentLoading {
	#count = $state(0);

	get busy() {
		return this.#count > 0;
	}

	start() {
		this.#count += 1;
	}

	stop() {
		this.#count = Math.max(0, this.#count - 1);
	}

	async run<T>(fn: () => Promise<T>): Promise<T> {
		this.start();
		try {
			return await fn();
		} finally {
			this.stop();
		}
	}
}

export const contentLoading = new ContentLoading();
