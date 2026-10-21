"""Pruebas UI locales con API simulada. NO ejercitan RLS real de Supabase.
La navegación file/http está bloqueada en este sandbox, por eso se inyectan recursos en about:blank."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
js=(root/'assets/app.js').read_text()
css=(root/'assets/styles.css').read_text()
results=[]
uid='11111111-1111-4111-8111-111111111111'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def fresh():
  page=browser.new_page(); page.set_content('<!doctype html><html lang="es"><head><meta charset="UTF-8"></head><body><div id="app"></div></body></html>');page.add_style_tag(content=css);return page
 page=fresh()
 page.add_script_tag(content="window.ASOCULSOR_CONFIG={supabaseUrl:'',supabaseKey:'',demoOnly:false};")
 page.add_script_tag(content=js)
 page.get_by_text('Conecta Supabase',exact=True).wait_for(timeout=7000)
 assert not page.get_by_text('Entrar a la demostración').count()
 results.append('PASS: sin Supabase, login real cerrado; sin demo')
 page.close()
 for rol in ['operador','admin']:
  page=fresh(); err=[];page.on('pageerror',lambda e:err.append(str(e)))
  page.add_script_tag(content="window.ASOCULSOR_CONFIG={supabaseUrl:'https://mock.supabase.co',supabaseKey:'sb_publishable_mock',demoOnly:false};")
  page.add_script_tag(content='''
  window.mockCalls=[];
  window.fetch = async (url, opts={}) => {
    const path=new URL(url).pathname+new URL(url).search; mockCalls.push({path,method:opts.method||'GET'});
    let data=[];
    if(path.startsWith('/auth/v1/token')) data={access_token:'fake-access-token',refresh_token:'fake-refresh-token',user:{id:'11111111-1111-4111-8111-111111111111',email:'test@example.org'}};
    else if(path.startsWith('/auth/v1/user'))data={id:'11111111-1111-4111-8111-111111111111',email:'test@example.org'};
    else if(path.startsWith('/rest/v1/profiles')) data=[{id:'11111111-1111-4111-8111-111111111111',full_name:'Usuario de prueba',email:'test@example.org',role:window.mockRole,active:true}];
    else if(opts.method==='POST')data=[{id:'22222222-2222-4222-8222-222222222222',created_at:'2026-10-20T12:00:00Z',...JSON.parse(opts.body||'{}')}];
    return {ok:true,status:200,text:async()=>JSON.stringify(data)};
  };
  ''')
  page.evaluate('(r)=>window.mockRole=r',rol)
  page.add_script_tag(content=js)
  page.get_by_text('Bienvenido de nuevo',exact=True).wait_for(timeout=7000)
  page.locator('form[data-form=auth] input[name=email]').fill('test@example.org')
  page.locator('form[data-form=auth] input[name=password]').fill('TestPassword123!')
  page.locator('form[data-form=auth] button[type=submit]').click()
  try:
   page.get_by_text('Panel general',exact=True).first.wait_for(timeout=5000)
  except Exception:
   print('DEBUG',rol,repr(page.locator('body').inner_text()[:600]),err,page.evaluate('window.mockCalls'))
   raise
  if rol=='operador':
   assert page.locator('button[data-page="donations"]').count()==0
   assert page.locator('button[data-page="documents"]').count()==0
   assert page.locator('button[data-page="reports"]').count()==0
   assert not page.evaluate("mockCalls.some(x=>x.path.includes('/donations?')||x.path.includes('/documents?'))")
   results.append('PASS: operador sin consulta API de datos financieros/documentos')
  else:
   assert page.locator('button[data-page="donations"]').count()==1
   assert page.locator('button[data-page="documents"]').count()==1
   assert page.evaluate("mockCalls.some(x=>x.path.includes('/donations?'))")
   results.append('PASS: administrador ve donaciones y documentos')
  page.locator('button.nav-btn[data-page="beneficiaries"]').click()
  page.locator('[data-action="open-create"][data-table="beneficiaries"]').first.click()
  page.locator('input[name="first_name"]').fill('Juan')
  page.locator('input[name="last_name"]').fill('Prueba')
  page.locator('input[name="code"]').fill('BEN-PRUEBA')
  page.locator('form[data-form="record"] button[type="submit"]').click()
  page.get_by_text('Registro creado correctamente.').wait_for(timeout=7000)
  assert not err,err
  results.append(f'PASS: formulario + POST simulado ({rol})')
  page.close()
 browser.close()
print('\n'.join(results))
