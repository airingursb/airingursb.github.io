import test from 'node:test';
import assert from 'node:assert/strict';
import {BirdVisit, BirdVisitGate, birdWeatherAllows} from '../src/components/bear-study/bird-state.ts';
const now=Date.parse('2026-09-13T12:00:00+08:00');
test('bird visits require fresh dry daytime weather',()=>{
 for(const kind of ['sunny','cloudy']) assert.equal(birdWeatherAllows({now,weather:{kind,observedAt:now}}),true);
 for(const kind of ['rainy','thunder']) assert.equal(birdWeatherAllows({now,weather:{kind,observedAt:now}}),false);
 assert.equal(birdWeatherAllows({now,weather:null}),false);
 assert.equal(birdWeatherAllows({now,weather:{kind:'sunny',observedAt:now-46*60000}}),false);
 const night=Date.parse('2026-09-13T19:00:00+08:00');
 assert.equal(birdWeatherAllows({now:night,weather:{kind:'sunny',observedAt:night}}),false);
});
test('one bird is shared between the window and garden with a cooldown',()=>{
 const gate=new BirdVisitGate();
 assert.equal(gate.claim('window',now),true);
 assert.equal(gate.claim('garden',now),false);
 gate.release('garden',now,0);
 assert.equal(gate.claim('garden',now),false);
 gate.release('window',now,0);
 assert.equal(gate.claim('garden',now+179999),false);
 assert.equal(gate.claim('garden',now+180000),true);
});
test('bird lands, taps once, responds without queuing taps and leaves',()=>{
 const bird=new BirdVisit(0);
 bird.start(); assert.equal(bird.phase,'landing');
 bird.advance(900); assert.equal(bird.phase,'perched');
 assert.equal(bird.advance(2600),true); assert.equal(bird.phase,'peck');
 assert.equal(bird.advance(100),false);
 bird.interact(); assert.equal(bird.phase,'hop');
 bird.advance(300); bird.interact(); bird.advance(400); assert.notEqual(bird.phase,'hop');
 bird.advance(11700); assert.equal(bird.phase,'leaving');
 bird.advance(900); assert.equal(bird.phase,'away');
});

test('returning on consecutive Singapore dates shortens the first visit, including reloads', async () => {
 const { birdReturnVisit, birdDelay } = await import('../src/components/bear-study/bird-state.ts');
 const values = new Map();
 const storage = {getItem:key=>values.get(key) ?? null,setItem:(key,value)=>values.set(key,value)};
 const first = Date.parse('2026-09-13T23:59:00+08:00');
 assert.equal(birdReturnVisit(() => storage,first),false);
 // When the same browser returns after Singapore midnight, then it earns the faster visit.
 assert.equal(birdReturnVisit(() => storage,first+120000),true);
 assert.equal(birdReturnVisit(() => storage,first+180000),true);
 assert.equal(birdDelay(0,true),10000);
 assert.equal(birdDelay(1,true),20000);
 assert.equal(birdDelay(0,false),20000);
 assert.equal(birdReturnVisit(() => storage,first+3*86400000),false);
});

test('unavailable local storage keeps the ordinary first visit', async () => {
 const { birdReturnVisit } = await import('../src/components/bear-study/bird-state.ts');
 const storage = {getItem(){throw new DOMException('Blocked','SecurityError');},setItem(){}};
 assert.equal(birdReturnVisit(() => storage,now),false);
});
