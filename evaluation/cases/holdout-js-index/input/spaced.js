function index(entries, report) {
  const byName = new Map();


  for (const [name, value] of entries) {
    const key = name.toLowerCase();


    byName.set(key, value);
  }


  const names = [...byName.keys()];


  names.sort();


  report(names);


  return byName;
}
