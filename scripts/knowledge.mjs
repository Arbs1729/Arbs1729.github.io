import {readFile,writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(await readFile('src/data/portfolio.ts','utf8'));
const {person,experience,stories,groups}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const cultureSource=await readFile('src/data/culture.ts','utf8');
const {musicPicks,screenPicks}=await import(`data:text/javascript;base64,${Buffer.from(cultureSource).toString('base64')}`);
await writeFile('worker/knowledge.json',JSON.stringify({
  person,experience,stories,groups,
  interests:{
    animeAndScreen:{favourites:['Dragon Ball Z (favourite)','Monster','Psycho-Pass season 1','Frieren','Cowboy Bebop','Neon Genesis Evangelion'],ratedPicks:screenPicks.map(({title,score,format})=>({title,score,format}))},
    formulaOne:'Follows Formula 1, especially Max Verstappen and Red Bull, including the engineering and upgrade trade-offs behind performance.',
    music:{selectedTracks:musicPicks.map(({title,artist,album})=>({title,artist,album})),broaderListening:['Joe Hisaishi Studio Ghibli works','Hans Zimmer Interstellar','Evan Call Frieren','Succession theme','Demon Slayer theme','Neon Genesis Evangelion theme','KK','Atif Aslam']},
    technologyAndProduct:'Currently exploring AI and revisiting computer science basics; interested in the systems and product decisions behind useful technology.',
    marketsAndMacro:'Follows macroeconomics and geopolitics, including oil prices, semiconductor supply, and DRAM/SSD price shifts.'
  },
  credentials:'BITS Pilani Hyderabad B.E. Computer Science, Finance minor, 2020–2024; CGPA 8.52, minor 9.67; CFA Level II cleared, FRM Parts I and II cleared',
  sitePages:[{label:'Home',url:'/'},{label:'Work',url:'/work/'},{label:'About',url:'/about/'},{label:'Interests',url:'/interests/'}]
},null,2));
console.log('Public portfolio knowledge regenerated. No private source documents included.');
