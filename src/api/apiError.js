// Единая форма ошибки для мок- и реального API, чтобы UI не знал о разнице между ними
export class ApiError extends Error {
  constructor(message, { status = 400, field = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = field;
  }
}
