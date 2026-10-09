import test from 'node:test';
import assert from 'node:assert/strict';
import {canManageTarget} from '../src/permissions.js';

const u=(id,accessProfile,extra={})=>({id,accessProfile,active:true,...extra});

test('administración principal puede gestionar otros perfiles',()=>{
 assert.equal(canManageTarget(u('a','autoridad',{mainAdmin:true}),u('b','autoridad')),true);
});

test('autoridad gestiona perfiles inferiores pero no otra autoridad',()=>{
 const actor=u('a','autoridad');
 assert.equal(canManageTarget(actor,u('b','biblioteca')),true);
 assert.equal(canManageTarget(actor,u('c','docente')),true);
 assert.equal(canManageTarget(actor,u('d','autoridad')),false);
});

test('biblioteca puede gestionar docentes y lectores pero no autoridades ni pares',()=>{
 const actor=u('a','biblioteca');
 assert.equal(canManageTarget(actor,u('b','docente')),true);
 assert.equal(canManageTarget(actor,u('c','lector')),true);
 assert.equal(canManageTarget(actor,u('d','biblioteca')),false);
 assert.equal(canManageTarget(actor,u('e','autoridad')),false);
});

test('nadie se administra a sí mismo mediante jerarquía',()=>{
 const actor=u('a','autoridad',{mainAdmin:true});
 assert.equal(canManageTarget(actor,actor),false);
});
