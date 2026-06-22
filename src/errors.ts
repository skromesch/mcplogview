export class UnknownSourceError extends Error {
  constructor(sourceId: string) {
    super(`unknown source: ${sourceId}`);
    this.name = 'UnknownSourceError';
  }
}

export class DuplicateSourceIdError extends Error {
  constructor(sourceId: string) {
    super(`duplicate source id: ${sourceId}`);
    this.name = 'DuplicateSourceIdError';
  }
}

export class RemoteLogFileNotFoundError extends Error {
  constructor(path: string) {
    super(`remote log file not found: ${path}`);
    this.name = 'RemoteLogFileNotFoundError';
  }
}

export class InvalidSshResponseError extends Error {
  constructor(message: 'invalid ssh log response header' | 'missing ssh size header') {
    super(message);
    this.name = 'InvalidSshResponseError';
  }
}
