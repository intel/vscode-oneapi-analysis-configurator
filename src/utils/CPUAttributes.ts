export const cpuAttributesTooltips = {
  alloc_section: {
    description: 'Allocates one or more variables in the specified section. Controls section attribute specification for variables.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/alloc-section.html)',
    signature: '#pragma alloc_section(var1,var2,..., "r;attribute-list")'
  },
  block_loop: {
    description: 'Enables loop blocking for the immediately following nested loops. block_loop enables loop blocking for the nested loops. noblock_loop disables loop blocking for the nested loops.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/block-loop-noblock-loop.html)',
    signature: '#pragma block_loop [clause[,clause]...]'
  },
  noblock_loop: {
    description: 'Disables loop blocking for the immediately following nested loops. block_loop enables loop blocking for the nested loops. noblock_loop disables loop blocking for the nested loops.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/block-loop-noblock-loop.html)',
    signature: '#pragma noblock_loop'
  },
  code_align: {
    description: 'Specifies the byte alignment for a loop.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/code-align.html)',
    signature: '#pragma code_align(n)'
  },
  distribute_point: {
    description: 'Instructs the compiler to prefer loop distribution at the location indicated.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/distribute-point.html)',
    signature: '#pragma distribute_point'
  },
  inline: {
    description: 'The inline pragma is a hint to the compiler that the user prefers that the calls in question be inlined, but expects the compiler not to inline them if its heuristics determine that the inlining would be overly aggressive and might slow down the compilation of the source code excessively, create too large of an executable, or degrade performance.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/inline-noinline-forceinline.html)',
    signature: '#pragma inline [recursive]'
  },
  forceinline: {
    description: 'The forceinline pragma indicates that the calls in question should be inlined whenever the compiler is capable of doing so.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/inline-noinline-forceinline.html)',
    signature: '#pragma forceinline [recursive]'
  },
  noinline: {
    description: 'The noinline pragma indicates that the calls in question should not be inlined.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/inline-noinline-forceinline.html)',
    signature: '#pragma noinline'
  },
  intel_omp_task: {
    description: 'For Intel legacy tasking, specifies a unit of work, potentially executed by a different thread.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/intel-omp-task.html)',
    signature: '#pragma intel_omp_task [clause[[,]clause]...]'
  },
  intel_omp_taskq: {
    description: 'For Intel legacy tasking, specifies an environment for the while loop in which to queue the units of work specified by the enclosed task pragma.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/intel-omp-taskq.html)',
    signature: '#pragma intel_omp_taskq[clause[[,]clause]...]'
  },
  loop_count: {
    description: 'Specifies the iterations for a for loop.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/loop-count.html)',
    signature: '#pragma loop_count'
  },
  nofusion: {
    description: 'Prevents a loop from fusing with adjacent loops.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/nofusion.html)',
    signature: '#pragma nofusion'
  },
  novector: {
    description: 'Specifies that a particular loop should never be vectorized.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/novector.html)',
    signature: '#pragma novector'
  },
  'omp simd early_exit': {
    description: 'Extends #pragma omp SIMD, allowing vectorization of multiple exit loops.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/omp-simd-early-exit.html)',
    signature: '#pragma omp simd early_exit'
  },
  optimize: {
    description: 'Enables or disables optimizations for code after this pragma until another optimize pragma or end of the translation unit.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/optimize.html)',
    signature: '#pragma optimize("", on|off)'
  },
  optimization_level: {
    description: 'Controls optimization for one function or all functions after its first occurrence.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/optimization-level.html)',
    signature: '#pragma [intel|GCC] optimization_level n'
  },
  optimization_parameter: {
    description: 'Passes certain information about a function to the optimizer.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/optimization-parameter.html)',
    signature: '#pragma intel optimization_parameter'
  },
  parallel: {
    description: 'Resolves dependencies to facilitate auto-parallelization of the immediately following loop.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/parallel-noparallel.html)',
    signature: '#pragma parallel [clause[ [,]clause]...]'
  },
  noparallel: {
    description: 'Prevents auto-parallelization of the immediately following loop.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/parallel-noparallel.html)',
    signature: '#pragma noparallel'
  },
  prefetch: {
    description: 'This pragma hints to the compiler to generate data prefetches for some memory references. These hints affect the heuristics used in the compiler. Prefetching data can minimize the effects of memory latency.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/prefetch-noprefetch.html)',
    signature: '#pragma prefetch'
  },
  noprefetch: {
    description: 'The noprefetch pragma hints to the compiler not to generate data prefetches for some memory references. This affects the heuristics used in the compiler.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/prefetch-noprefetch.html)',
    signature: '#pragma noprefetch [var1 [, var2]...]'
  },
  simd: {
    description: 'The SIMD pragma is used to guide the compiler to vectorize more loops. Vectorization using the SIMD pragma complements (but does not replace) the fully automatic approach.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/simd.html)',
    signature: '#pragma simd [clause[ [,] clause]...]'
  },
  simdoff: {
    description: 'Specifies a block of code in the SIMD loop or SIMD-enabled function that should be executed serially, in a logical order of SIMD lanes.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/simdoff.html)',
    signature: '#pragma simdoff'
  },
  unroll: {
    description: 'The unroll[n] pragma tells the compiler how many times to unroll a counted loop.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/unroll-nounroll.html)',
    signature: '#pragma unroll(n)'
  },
  nounroll: {
    description: 'The nounroll pragma instructs the compiler not to unroll a specified loop.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/unroll-nounroll.html)',
    signature: '#pragma nounroll'
  },
  unroll_and_jam: {
    description: 'The unroll_and_jam pragma partially unrolls one or more loops higher in the nest than the innermost loop and fuses/jams the resulting loops back together. This transformation allows more reuses in the loop.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/unroll-and-jam-nounroll-and-jam.html)',
    signature: '#pragma unroll_and_jam (n)'
  },
  nounroll_and_jam: {
    description: 'When unrolling a loop increases register pressure and code size, it may be necessary to prevent unrolling of a nested loop or an imperfect nested loop. In such cases, use the nounroll_and_jam pragma. The nounroll_and_jam pragma hints to the compiler not to unroll a specified loop.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/unroll-and-jam-nounroll-and-jam.html)',
    signature: '#pragma nounroll_and_jam'
  },
  vector: {
    description: 'Tells the compiler that the loop should be vectorized according to the argument keywords.\n\n[Learn more](https://www.intel.com/content/www/us/en/develop/documentation/oneapi-dpcpp-cpp-compiler-dev-guide-and-reference/top/compiler-reference/pragmas/intel-specific-pragma-reference/vector.html)',
    signature: '#pragma vector {always[assert]|aligned|unaligned|dynamic_align[(var)]|nodynamic_align|temporal|nontemporal|[no]vecremainder|[no]mask_readwrite|vectorlength(n1[, n2]...)}'
  }
};

export const cpuAttributesSnippets = {
  'alloc_section(var1,var2,..., \'r;attribute-list\')': {
    description: 'Allocates one or more variables in the specified section. Controls section attribute specification for variables.',
    prefix: '#pragma alloc_section',
    body: [
      '#pragma alloc_section'
    ]
  },
  'block_loop [clause[,clause]...]': {
    description: 'Enables loop blocking for the immediately following nested loops. block_loop enables loop blocking for the nested loops. noblock_loop disables loop blocking for the nested loops.',
    prefix: '#pragma block_loop',
    body: [
      '#pragma block_loop'
    ]
  },
  noblock_loop: {
    description: 'Disables loop blocking for the immediately following nested loops. block_loop enables loop blocking for the nested loops. noblock_loop disables loop blocking for the nested loops.',
    prefix: '#pragma noblock_loop',
    body: [
      '#pragma noblock_loop'
    ]
  },
  'code_align(n)': {
    description: 'Specifies the byte alignment for a loop',
    prefix: '#pragma code_align',
    body: [
      '#pragma code_align'
    ]
  },
  distribute_point: {
    description: 'Instructs the compiler to prefer loop distribution at the location indicated.',
    prefix: '#pragma distribute_point',
    body: [
      '#pragma distribute_point'
    ]
  },
  'inline [recursive]': {
    description: 'The inline pragma is a hint to the compiler that the user prefers that the calls in question be inlined, but expects the compiler not to inline them if its heuristics determine that the inlining would be overly aggressive and might slow down the compilation of the source code excessively, create too large of an executable, or degrade performance.',
    prefix: '#pragma inline',
    body: [
      '#pragma inline'
    ]
  },
  'forceinline [recursive]': {
    description: 'The forceinline pragma indicates that the calls in question should be inlined whenever the compiler is capable of doing so.',
    prefix: '#pragma forceinline',
    body: [
      '#pragma forceinline'
    ]
  },
  noinline: {
    description: 'The noinline pragma indicates that the calls in question should not be inlined.',
    prefix: '#pragma noinline',
    body: [
      '#pragma noinline'
    ]
  },
  'intel_omp_task [clause[[,]clause]...]': {
    description: 'For Intel legacy tasking, specifies a unit of work, potentially executed by a different thread.',
    prefix: '#pragma intel_omp_task',
    body: [
      '#pragma intel_omp_task'
    ]
  },
  'intel_omp_taskq[clause[[,]clause]...]': {
    description: 'For Intel legacy tasking, specifies an environment for the while loop in which to queue the units of work specified by the enclosed task pragma.',
    prefix: '#pragma intel_omp_taskq',
    body: [
      '#pragma intel_omp_taskq'
    ]
  },
  loop_count: {
    description: 'Specifies the iterations for a for loop.',
    prefix: '#pragma loop_count',
    body: [
      '#pragma loop_count'
    ]
  },
  nofusion: {
    description: 'Prevents a loop from fusing with adjacent loops.',
    prefix: '#pragma nofusion',
    body: [
      '#pragma nofusion'
    ]
  },
  novector: {
    description: 'Specifies that a particular loop should never be vectorized.',
    prefix: '#pragma novector',
    body: [
      '#pragma novector'
    ]
  },
  'omp simd early_exit': {
    description: 'Extends #pragma omp simd, allowing vectorization of multiple exit loops.',
    prefix: '#pragma omp simd early_exit',
    body: [
      '#pragma omp simd early_exit'
    ]
  },
  'optimize(\'\', on|off)': {
    description: 'Enables or disables optimizations for code after this pragma until another optimize pragma or end of the translation unit.',
    prefix: '#pragma optimize',
    body: [
      '#pragma optimize'
    ]
  },
  'optimization_level n': {
    description: 'Controls optimization for one function or all functions after its first occurrence.',
    prefix: '#pragma optimization_level',
    body: [
      '#pragma optimization_level'
    ]
  },
  optimization_parameter: {
    description: 'Passes certain information about a function to the optimizer.',
    prefix: '#pragma intel optimization_parameter',
    body: [
      '#pragma intel optimization_parameter'
    ]
  },
  'parallel [clause[ [,]clause]...]': {
    description: 'Resolves dependencies to facilitate auto-parallelization of the immediately following loop.',
    prefix: '#pragma parallel',
    body: [
      '#pragma parallel'
    ]
  },
  noparallel: {
    description: 'Prevents auto-parallelization of the immediately following loop.',
    prefix: '#pragma noparallel',
    body: [
      '#pragma noparallel'
    ]
  },
  prefetch: {
    description: 'This pragma hints to the compiler to generate data prefetches for some memory references. These hints affect the heuristics used in the compiler. Prefetching data can minimize the effects of memory latency.',
    prefix: '#pragma prefetch',
    body: [
      '#pragma prefetch'
    ]
  },
  'noprefetch [var1 [, var2]...]': {
    description: 'The noprefetch pragma hints to the compiler not to generate data prefetches for some memory references. This affects the heuristics used in the compiler.',
    prefix: '#pragma noprefetch',
    body: [
      '#pragma noprefetch'
    ]
  },
  'simd [clause[ [,] clause]...]': {
    description: 'The SIMD pragma is used to guide the compiler to vectorize more loops. Vectorization using the simd pragma complements (but does not replace) the fully automatic approach.',
    prefix: '#pragma simd',
    body: [
      '#pragma simd'
    ]
  },
  simdoff: {
    description: 'Specifies a block of code in the SIMD loop or SIMD-enabled function that should be executed serially, in a logical order of SIMD lanes.',
    prefix: '#pragma simdoff',
    body: [
      '#pragma simdoff'
    ]
  },
  'unroll(n)': {
    description: 'The unroll[n] pragma tells the compiler how many times to unroll a counted loop.',
    prefix: '#pragma unroll',
    body: [
      '#pragma unroll'
    ]
  },
  nounroll: {
    description: 'The nounroll pragma instructs the compiler not to unroll a specified loop.',
    prefix: '#pragma nounroll',
    body: [
      '#pragma nounroll'
    ]
  },
  'unroll_and_jam (n)': {
    description: 'The unroll_and_jam pragma partially unrolls one or more loops higher in the nest than the innermost loop and fuses/jams the resulting loops back together. This transformation allows more reuses in the loop.',
    prefix: '#pragma unroll_and_jam (n)',
    body: [
      '#pragma unroll_and_jam (n)'
    ]
  },
  nounroll_and_jam: {
    description: 'When unrolling a loop increases register pressure and code size it may be necessary to prevent unrolling of a nested loop or an imperfect nested loop. In such cases, use the nounroll_and_jam pragma. The nounroll_and_jam pragma hints to the compiler not to unroll a specified loop.',
    prefix: '#pragma nounroll_and_jam',
    body: [
      '#pragma nounroll_and_jam'
    ]
  },
  vector: {
    description: 'Tells the compiler that the loop should be vectorized according to the argument keywords.',
    prefix: '#pragma vector',
    body: [
      '#pragma vector'
    ]
  }
};
