import {test} from 'node:test';
import assert from 'node:assert/strict';
import {qualifies} from './rules.mjs';
const r={title:'Nintendo Switch 2 Pro Controller The Legend of Zelda 40th Anniversary Edition',available:true,total:109.99};
test('qualifying offer',()=>assert.equal(qualifies(r,{}),true));
test('Lobbes HTML alone never qualifies',()=>assert.equal(qualifies(r,{cartRequired:true}),false));
test('over budget excluded',()=>assert.equal(qualifies({...r,total:149.95},{}),false));
test('wrong edition excluded',()=>assert.equal(qualifies({...r,title:'Nintendo Switch Pro Controller Zelda Tears of the Kingdom'},{}),false));
test('unknown stock excluded',()=>assert.equal(qualifies({...r,available:false},{}),false));
