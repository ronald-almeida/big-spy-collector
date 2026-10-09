import {auth} from '@/lib/auth';
import {redirect} from 'next/navigation';
import Login from '@/components/login';
export default async function Page(){if((await auth())?.user)redirect('/');return <Login/>;}
