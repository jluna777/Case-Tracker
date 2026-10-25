export default function Avatar({ name, large }: { name: string, large?: boolean }) {
  return (
    <span className={`avatar avatar-${name.toLowerCase()}${large ? ' avatar-large' : ''}`} aria-hidden="true">
      {name[0]}
    </span>
  )
}
