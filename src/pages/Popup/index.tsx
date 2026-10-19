import React from 'react'
import {createRoot} from 'react-dom/client'

import Popup from './Popup'
import './index.css'

createRoot(document.getElementById('app-container')!).render(<Popup />)
