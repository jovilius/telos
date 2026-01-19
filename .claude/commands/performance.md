Analyze JavaScript performance for: $ARGUMENTS

Use this rubric to assess and provide optimization recommendations. Score each criterion 1-5 (1=critical issue, 5=excellent).

## Analysis Categories

### A: Algorithm Complexity (30%)
- A1. Spatial lookups: O(1) vs O(n²) neighbor/collision detection
- A2. Loop iteration: Nested loops in hot paths
- A3. Array operations: `.slice()`, `.map()`, `.filter()` in hot paths
- A4. Computation spreading: Heavy work distributed across frames
- A5. Early exits: Bail out when conditions not met

### B: Memory Allocation (20%)
- B1. Object pooling: Reuse vs creating new objects
- B2. Array operations: `.unshift()`, `.splice()` vs circular buffers
- B3. Typed arrays: `Float32Array`/`Int32Array` for numerical data
- B4. String formatting: Template literals in loops
- B5. Closure allocation: Closures created in hot paths

### C: Rendering Performance (25%)
- C1. Canvas state: Context state change frequency
- C2. Gradient caching: Gradient reuse
- C3. Path batching: Similar draw operations batched
- C4. Quality adaptation: Work reduction when FPS drops
- C5. Off-screen detection: Off-canvas rendering skipped

### D: DOM Interaction (10%)
- D1. Layout thrashing: Read/write cycles in loops
- D2. Style batching: `cssText`/classes vs individual styles
- D3. Event handlers: Throttle/debounce usage
- D4. Animation frame: Updates in rAF callback
- D5. Reflow triggers: Forced synchronous layouts

### E: Math & Computation (15%)
- E1. Math caching: Repeated sqrt/trig cached
- E2. Approximate math: Approximations where precision isn't critical
- E3. Division avoidance: Multiply by reciprocal for constants
- E4. Bitwise operations: Integer math optimization
- E5. Data layout: SoA vs AoS consideration

## Output Format

1. **Score Table**: Rate each criterion with brief notes
2. **Total Score**: Calculate weighted score out of 100
3. **Top 3 Issues**: Highest-impact problems found
4. **Recommended Fixes**: Prioritized list with code examples
5. **Quick Wins**: Low-effort, high-impact changes

## Priority Fixes Reference

**High Impact:**
- Replace `.unshift()` with circular buffers
- Cache gradients, color strings, math results
- Implement spatial partitioning for O(1) lookups

**Medium Impact:**
- Use squared distance comparisons (avoid `sqrt()`)
- Batch canvas state changes by visual properties
- Use TypedArrays for large numerical datasets

**Lower Impact:**
- Off-screen culling
- `requestIdleCallback` for non-critical work
- Page Visibility API (pause when tab hidden)

Analyze the specified files/paths and provide actionable recommendations.
