import asyncio, base64, json, os, urllib.request, urllib.error
import edge_tts
URL='https://ftiuzwwshcocvkvtdngm.supabase.co/functions/v1/daro-weather'
KEY='sb_publishable_JNcWc4KR76hOSqe9mvs9Tw_Vu4XOicE'
def post(data):
 req=urllib.request.Request(URL,data=json.dumps(data).encode(),headers={'Content-Type':'application/json','apikey':KEY})
 try:
  with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  print('Weather endpoint status:',e.code,'Message:',e.read().decode()[:200]);raise
async def main():
 data=post({})
 if data.get('audio_base64'):print('El boletín ya tiene su voz actualizada.');return
 text=data['text']
 if len(text)>800:raise RuntimeError('Boletín demasiado largo')
 voice=edge_tts.Communicate(text,voice='es-EC-LuisNeural',rate='-11%',pitch='+2Hz')
 chunks=[]
 async for chunk in voice.stream():
  if chunk['type']=='audio':chunks.append(chunk['data'])
 request_url=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&audience=fasttrip-daro-weather'
 req=urllib.request.Request(request_url,headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
 with urllib.request.urlopen(req,timeout=30) as r:token=json.load(r)['value']
 result=post({'action':'publish_audio','token':token,'text':text,'audio_base64':base64.b64encode(b''.join(chunks)).decode()})
 print(result['message'])
asyncio.run(main())
