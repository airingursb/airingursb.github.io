import {readFile,writeFile} from 'node:fs/promises';
const base=new URL('../src/data/ai-weekly/',import.meta.url);
const read=async name=>JSON.parse(await readFile(new URL(name,base),'utf8'));
const [sources,inventory,draft]=await Promise.all(['005.sources.json','005.products.json','005.json'].map(read));
const parse=copy=>Object.fromEntries(copy.split(/<!-- chapter: ([\w-]+) -->/).slice(1).flatMap((v,i,a)=>i%2?[]:[[v,a[i+1].split(/^### /m).slice(1).map(section=>{
 const [title,...body]=section.split('\n');
 const first=body.join('\n').trim().split('\n\n')[0];
 const description=first.replace(/\[\d+\]\(#source-\d+\)/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\*\*/g,'').trim();
 return {title,description};
})]]));
const [zh,en]=await Promise.all(['zh','en'].map(async lang=>parse(await readFile(new URL('005.'+lang+'.md',base),'utf8'))));
const references={'less-1':[13],'less-2':[13],'less-3':[16],'less-4':[6,13],'less-5':[16,1],'evidence-1':[3],'evidence-2':[7],'work-1':[2],'work-2':[8],'work-3':[14],'life-1':[5],'life-2':[15],'life-3':[4,11,12]};
const columns=[];
function add(id,group,title,description,ids){
 const links=ids.map(n=>sources.find(s=>s.n===n).reading_url);
 columns.push({id,group,title,description,anchor:'column-'+String(columns.length+1).padStart(2,'0'),source:links[0],relatedSources:links.slice(1)});
}
for(const group of draft.groups){
 if(group.id==='tools'){
  for(const p of inventory.products)add('product-'+p.id,'tools',{zh:p.name,en:p.name},p.summary,[p.source]);
  add('bots','tools',{zh:'十个 Bot，十个具体任务',en:'Ten bots, ten concrete jobs'},{zh:'从追踪承诺到整理书签，完整保留 kaito 的十个 Grok Bot 推荐。',en:'All ten Grok Bot recommendations from kaito, from tracking commitments to sorting bookmarks.'},[17]);
  add('newsletter','tools',{zh:'两封通讯里的延伸阅读',en:'More threads from two newsletters'},{zh:'AIGC Weekly #193 与 DEX #368：模型更新、设计资源、产品作者性与协作。',en:'AIGC Weekly #193 and DEX #368: model updates, design resources, product authorship and collaboration.'},[11,12]);
 }else{
  for(let i=0;i<zh[group.id].length;i++){
   const id=group.id+'-'+(i+1);
   add(id,group.id,{zh:zh[group.id][i].title,en:en[group.id][i].title},{zh:zh[group.id][i].description,en:en[group.id][i].description},references[id]);
  }
 }
}
const represented=new Set(columns.flatMap(c=>[c.source,...c.relatedSources]));
if(represented.size!==17||sources.some(s=>!represented.has(s.reading_url)))throw Error('Incomplete issue 005 source coverage');
await writeFile(new URL('005.columns.json',base),JSON.stringify(columns,null,2)+'\n');
console.log(columns.length+' editorial units, '+represented.size+' reading sources');
