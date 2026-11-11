import {createClient} from 'npm:@supabase/supabase-js@2.49.1';
import {outboxHandler} from './handler.js';
const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(outboxHandler(service,name=>Deno.env.get(name)));
