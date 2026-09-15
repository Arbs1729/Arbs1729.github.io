// YouTube is the primary playback source. Local files are a persistent fallback
// when embedding or network playback is unavailable.
export const musicPicks = [
  {
    title: 'A Town with an Ocean View', artist: 'Joe Hisaishi',
    album: 'Kiki’s Delivery Service · A Symphonic Celebration version',
    youtubeId: 'pR4iCWB-VVQ', audio: '/media/audio/town-ocean-view.m4a',
  },
  {
    title: 'Iktara', artist: 'Kavita Seth & Amitabh Bhattacharya',
    album: 'Wake Up Sid', youtubeId: 'akjdj6iHttY', audio: '/media/audio/iktara.m4a',
  },
  {
    title: 'A Cruel Angel’s Thesis', artist: 'Yoko Takahashi',
    album: 'Neon Genesis Evangelion', youtubeId: 'o6wtDPVkKqI', audio: '/media/audio/cruel-angels-thesis.m4a',
  },
  {
    title: 'Time', artist: 'Hans Zimmer',
    album: 'Inception', youtubeId: 'c56t7upa8Bk', audio: '/media/audio/time.m4a',
  },
  {
    title: 'One Summer’s Day', artist: 'Joe Hisaishi',
    album: 'Spirited Away', youtubeId: 'TK1Ij_-mank', audio: '/media/audio/one-summers-day.m4a',
  },
  {
    title: 'CHA-LA HEAD-CHA-LA', artist: 'Hironobu Kageyama',
    album: 'Dragon Ball Z · 2005 version', youtubeId: 'JZQ3oUSSyHo', audio: '/media/audio/cha-la-head-cha-la.mp3',
  },
];
export const screenPicks=[
 ['Frieren: Beyond Journey’s End',10,'Series','154587','bx154587-qQTzQnEJJ3oB.jpg'],
 ['Grave of the Fireflies',10,'Film','578','bx578-vU6XcOlb1XFU.jpg'],
 ['Hajime no Ippo: The Fighting!',10,'Series','263','bx263-ivVyn9xAgwSZ.png'],
 ['Monster',10,'Series','19','bx19-gtMC64182sm4.jpg'],
 ['Cowboy Bebop',9.5,'Series','1','bx1-GCsPm7waJ4kS.png'],
 ['Dragon Ball Z',9.5,'Series','813','bx813-ZhnFNOeCU5dQ.png'],
 ['Neon Genesis Evangelion',9.5,'Series','30','bx30-AI1zr74Dh4ye.jpg'],
 ['The End of Evangelion',9.5,'Film','32','bx32-5JYsv0wc122I.jpg'],
 ['My Neighbor Totoro',9.5,'Film','523','bx523-fErBvxOHP7IX.jpg'],
 ['Ping Pong the Animation',9.5,'Series','20607','bx20607-fIOxVISIl0HY.jpg'],
 ['Vinland Saga',9.5,'Series','101348','bx101348-2fhDFPCuMNiz.jpg'],
 ['Demon Slayer: Mugen Train',9.5,'Film','112151','bx112151-1qlQwPB1RrJe.png'],
 ['Dragon Ball',9.5,'Series','223','bx223-scE5uJfXqqj8.png'],
 ['Frieren: Beyond Journey’s End Season 2',9.5,'Series','182255','bx182255-butzrqd4I0aC.jpg'],
 ['Attack on Titan',9.5,'Series · 8 rated entries','16498','bx16498-buvcRTBx4NSm.jpg'],
].map(([title,score,format,id,cover])=>({title,score,format,url:`https://anilist.co/anime/${id}/`,cover:`https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/${cover}`}));
