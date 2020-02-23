//v1
// on install we download the routes we want to cache for offline
self.addEventListener('install', evt =>
  {console.log("no actual caching lol")}
);


self.addEventListener('fetch', evt => {
  return;
});
