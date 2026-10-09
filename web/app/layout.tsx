import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'BIG Spy · Inteligência de ofertas',description:'Suas buscas, palavras-chave e ofertas em um só lugar.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
