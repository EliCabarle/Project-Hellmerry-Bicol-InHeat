import BicolMap from '@features/map-controls'
import AuthButton from './components/AuthButton'

export default function App() {
  // Fragment, not a wrapper div: any element with height: auto between #root
  // and the leaflet container collapses the map to 0px.
  return (
    <>
      <BicolMap />
      <AuthButton />
    </>
  )
}
