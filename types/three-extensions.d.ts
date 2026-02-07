import { ReactThreeFiber } from '@react-three/fiber'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

declare module '@react-three/fiber' {
  interface ThreeElements {
    reflector: ReactThreeFiber.Object3DNode<Reflector, typeof Reflector>
  }
}

export {}
