export namespace G {
	export interface Node {
		id: string
		children?: Array<Node>
		[x: string]: any
	}
}
