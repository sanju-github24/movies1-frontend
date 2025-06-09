import React from 'react'
import { Routes } from 'react-router-dom'
import { Route } from 'react-router-dom'
import Home from './paged/Home'
import Login from './paged/Login'
import EmailVerify from './paged/EmailVerify'
import ResetPassword from './paged/ResetPassword'
import { ToastContainer } from 'react-toastify';
const App = () => {
  return (
    <div>
      <ToastContainer/>
      <Routes>

        <Route path='/' element={<Home/>}/>
        <Route path='/login' element={<Login/>}/>
        <Route path='/email-verify' element={<EmailVerify/>}/>
        <Route path='/reset-password' element={<ResetPassword/>}/>
      </Routes>

    </div>
  )
}

export default App