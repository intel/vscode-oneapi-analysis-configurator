export interface IAttributes { [name:string]:{ description?: string; signature?: string; }; }

export const attributes: IAttributes = {
  fpga_register: {
    description: 'Forces a variable or array to be carried through the pipeline in registers.',
    signature: 'intel::fpga_register'
  },
  fpga_memory: {
    description: 'Forces a variable or array to be implemented as embedded memory. The optional string parameter impl_type can be BLOCK_RAM or MLAB.',
    signature: 'intel::fpga_memory("impl_type")'
  },
  numbanks: {
    description: 'Specifies that the memory implementing the variable or array must have N memory banks.',
    signature: 'numbanks(N)'
  },
  bankwidth: {
    description: 'Specifies that the memory implementing the variable or array must be W bytes wide.',
    signature: 'bankwidth(W)'
  },
  singlepump: {
    description: 'Specifies that the memory implementing the variable or array should be clocked at the same rate as the accesses to it.',
    signature: 'singlepump'
  },
  doublepump: {
    description: 'Specifies that the memory implementing the variable or array should be clocked at twice the rate as the accesses to it.',
    signature: 'doublepump'
  },
  max_replicates: {
    description: 'Specifies that a maximum of N replicates should be created to enable simultaneous reads from the datapath.',
    signature: 'max_replicates(N)'
  },
  private_copies: {
    description: 'Specifies that a maximum of N private copies should be created to enable concurrent execution of N pipelined threads.',
    signature: 'private_copies(N)'
  },
  simple_dual_port: {
    description: 'Specifies that the memory implementing the variable or array should have no port that services both reads and writes.',
    signature: 'simple_dual_port'
  },
  merge: {
    description: 'Merge two or more variables or arrays in the same scope width-wise or depth-wise. All variables with the same key string are merged into the same memory system. The string type can be either width or depth.',
    signature: 'merge("key", "type")'
  },
  bank_bits: {
    description: 'Specifies that the local memory addresses should use bits (b0, b1,..., bn) for bank-selection, where (b0, b1,..., bn) are indicated in terms of word-addressing. The bits of the local memory address not included in (b0, b1,..., bn) will be used for word-selection in each bank.',
    signature: 'bank_bits(b0, b1,..., bn)'
  }
};
