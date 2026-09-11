function limited(items, maximum) {
  let total = 0;


  for (const item of items) {


    total += Math.min(item, maximum);
  }


  return total;
}
