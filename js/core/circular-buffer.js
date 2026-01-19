// ============== CIRCULAR BUFFER ==============
// O(1) push operations instead of O(n) shift() for history arrays

/**
 * CircularBuffer for numeric values using Float32Array
 * Replaces array.push() + array.shift() pattern with O(1) operations
 */
export class CircularBuffer {
  constructor(capacity) {
    this.buffer = new Float32Array(capacity);
    this.capacity = capacity;
    this.head = 0;  // Next write position
    this.count = 0; // Current number of elements
    this._sum = 0;  // Running sum for O(1) average
  }

  push(value) {
    // Subtract old value from sum if we're overwriting
    if (this.count === this.capacity) {
      this._sum -= this.buffer[this.head];
    }
    this._sum += value;
    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  // O(1) sum of all elements
  sum() {
    return this._sum;
  }

  // O(1) average of all elements
  average() {
    return this.count > 0 ? this._sum / this.count : 0;
  }

  // Get element by logical index (0 = oldest, count-1 = newest)
  get(index) {
    if (index < 0 || index >= this.count) return undefined;
    const actualIndex = (this.head - this.count + index + this.capacity) % this.capacity;
    return this.buffer[actualIndex];
  }

  // Get newest element
  newest() {
    if (this.count === 0) return undefined;
    return this.buffer[(this.head - 1 + this.capacity) % this.capacity];
  }

  // Get oldest element
  oldest() {
    if (this.count === 0) return undefined;
    return this.buffer[(this.head - this.count + this.capacity) % this.capacity];
  }

  get length() {
    return this.count;
  }

  // Iterate from oldest to newest
  *[Symbol.iterator]() {
    for (let i = 0; i < this.count; i++) {
      yield this.get(i);
    }
  }

  // For compatibility with array.reduce()
  reduce(fn, initial) {
    let acc = initial;
    for (let i = 0; i < this.count; i++) {
      acc = fn(acc, this.get(i), i);
    }
    return acc;
  }

  // Clear the buffer
  clear() {
    this.head = 0;
    this.count = 0;
    this._sum = 0;
  }
}

/**
 * CircularBuffer for object values (like {vx, vy})
 * Uses regular array but with circular indexing
 */
export class CircularObjectBuffer {
  constructor(capacity, factory = () => ({})) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    // Pre-allocate objects to avoid GC
    for (let i = 0; i < capacity; i++) {
      this.buffer[i] = factory();
    }
    this.head = 0;
    this.count = 0;
  }

  // Push by copying properties into the next slot
  push(obj) {
    const slot = this.buffer[this.head];
    Object.assign(slot, obj);
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
    return slot;
  }

  // Get element by logical index (0 = oldest, count-1 = newest)
  get(index) {
    if (index < 0 || index >= this.count) return undefined;
    const actualIndex = (this.head - this.count + index + this.capacity) % this.capacity;
    return this.buffer[actualIndex];
  }

  get length() {
    return this.count;
  }

  // Iterate from oldest to newest
  *[Symbol.iterator]() {
    for (let i = 0; i < this.count; i++) {
      yield this.get(i);
    }
  }

  clear() {
    this.head = 0;
    this.count = 0;
  }
}
