import StaffNavigation from './StaffNavigation'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaffNavigation />
      {children}
    </>
  )
}
