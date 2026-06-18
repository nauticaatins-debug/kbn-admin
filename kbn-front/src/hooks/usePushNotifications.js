// src/hooks/usePushNotifications.js
import { useState, useEffect } from 'react'
import axios from 'axios'

// ── VAPID public key — generala en el backend y pegala acá ──────
// Ver instrucciones en el README del backend
const VAPID_PUBLIC_KEY = 'BK9RWKh9AP4OcFeRlDiZatdzTK3oLn6H5TenagiaH5CO8nqyhOCS8YtkyeZe1snDn8KF4ui-6K_XrMSFJlVde6w'
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export const usePushNotifications = (axiosConfig, userId) => {
  const [permiso, setPermiso] = useState(Notification.permission)
  const [suscrito, setSuscrito] = useState(false)

  useEffect(() => {
    // Verificar si ya está suscrito al montar
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSuscrito(!!sub)
        })
      })
    }
  }, [])

  const suscribirse = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Tu navegador no soporta notificaciones push.')
      return
    }

    try {
      // 1. Pedir permiso al usuario
      const resultado = await Notification.requestPermission()
      setPermiso(resultado)
      if (resultado !== 'granted') return

      // 2. Obtener el service worker activo
      const reg = await navigator.serviceWorker.ready

      // 3. Suscribirse al servidor push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // 4. Mandar la suscripción al backend para guardarla
      await axios.post(
        'https://kbn-admin-production.up.railway.app/api/push/suscribir',
        {
          usuarioId: userId,
          endpoint: subscription.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        },
        axiosConfig
      )

      setSuscrito(true)
      console.log('✅ Suscripción push registrada')
    } catch (err) {
      console.error('Error al suscribirse:', err)
    }
  }

  const desuscribirse = async () => {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await axios.delete(
        `https://kbn-admin-production.up.railway.app/api/push/desuscribir/${userId}`,
        axiosConfig
      )
      setSuscrito(false)
    }
  }

  return { permiso, suscrito, suscribirse, desuscribirse }
}