import { Howl } from 'howler'

export default class Index {
	sound = null as unknown as Howl
	times = 0

	init(args: { src: string; loop?: boolean; times?: number }) {
		const { src, loop, times } = args

		this.sound = new Howl({
			src,
			onend: () => {
				if (!loop || !times) return

				this.times = this.times + 1

				if (this.times < times) {
					this.sound.play()
				} else {
					this.times = 0
				}
			}
		})
	}
}
