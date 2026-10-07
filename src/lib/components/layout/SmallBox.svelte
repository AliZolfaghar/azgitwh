<script lang="ts">
	interface Props {
		title: string;
		value: string;
		color: string;
		iconHtml: string;
	}

	let { title, value, color, iconHtml }: Props = $props();
</script>

<div class="small-box" style={`background: ${color}`}>
	<h3>{value}</h3>
	<p>{title}</p>
	<div class="box-icon" aria-hidden="true">{@html iconHtml}</div>
</div>
