export default function Avatar({ name }: { name: string }) {
  return (
    <span className={`avatar avatar-${name.toLowerCase()}`} aria-hidden="true">
      {name[0]}
    </span>
  )
}
