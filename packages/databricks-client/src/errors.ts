export class DatabricksAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabricksAuthError";
  }
}

export class DatabricksStatementError extends Error {
  constructor(
    message: string,
    public readonly statementId?: string
  ) {
    super(message);
    this.name = "DatabricksStatementError";
  }
}
