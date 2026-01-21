
float softshadow( in vec3 ro, in vec3 rd, float mint, float maxt, float w )
{
  float res = 1.0;
  float t = mint;
  for( int i=0; i<SHADOW_RES && t<maxt; i++ )
  {
    float h = sceneDistance(ro + t*rd);
    res = min( res, h/(t) );
    t += clamp(h, 0.005, 0.50);
    if( res<-1.0 || t>maxt ) break;
  }
  res = max(res,-1.0);
  return 0.25*(1.0+res)*(1.0+res)*(2.0-res);
}

