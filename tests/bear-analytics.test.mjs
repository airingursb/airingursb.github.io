import test from 'node:test';
import assert from 'node:assert/strict';
import { BearAnalyticsState, canTrackBearPage } from '../src/components/bear-study/analytics-state.ts';

test('only real homepage hosts and paths qualify, excluding scene simulations', () => {
  for (const host of ['ursb.me','www.ursb.me','airingursb.github.io']) assert.equal(canTrackBearPage(new URL(`https://${host}/`)),true);
  for (const url of ['http://localhost:4394/','http://100.93.37.97:4394/','https://ursb.me/playbook/living-scenes/','https://ursb.me/previews/bear-home/','https://ursb.me/?scene=day','https://ursb.me/?preview=final']) assert.equal(canTrackBearPage(new URL(url)),false,url);
});

test('one view and first engagement per scene per document, repeat clicks retain object counts', () => {
  const header = new BearAnalyticsState('header');
  assert.deepEqual(header.view(),[{name:'bear-header-view',data:{placement:'header',version:1}}]);
  assert.deepEqual(header.view(),[]);
  assert.deepEqual(header.click('mug','pointer').map(e=>e.name),['bear-header-engage','bear-header-click']);
  const again = header.click('bear','keyboard');
  assert.equal(again.length,1);assert.equal(again[0].name,'bear-header-click');assert.equal(again[0].data.object,'bear');assert.equal(again[0].data.input,'keyboard');
});

test('fast clicks establish exposure before engagement, and footer has its own denominator', () => {
  const footer = new BearAnalyticsState('footer');
  assert.deepEqual(footer.click('mailbox','pointer').map(e=>e.name),['bear-footer-view','bear-footer-engage','bear-footer-click']);
  assert.deepEqual(footer.view(),[]);
  assert.equal(new BearAnalyticsState('header').view().length,1);
});
