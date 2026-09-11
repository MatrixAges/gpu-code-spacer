function audit(validate: () => void, prepare: () => void, commit: (text: string) => void, user: string): void {
  const entry = `signed in: ${user}`;


  validate();


  prepare();


  commit(entry);
}
